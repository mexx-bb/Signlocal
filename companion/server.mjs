// Lokaler SignLocal-Companion: TLS/WSS, QR-Einmalpairing und optionales kurzlebiges Büro-Signaturpad.
import { createServer } from "node:https";
import { createServer as createHttpServer } from "node:http";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join, resolve } from "node:path";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { WebSocket, WebSocketServer } from "ws";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.SIGNLOCAL_PORT ?? 8787);
const keyPath = process.env.SIGNLOCAL_TLS_KEY;
const certificatePath = process.env.SIGNLOCAL_TLS_CERT;
const MAX_ACTIVE_SESSIONS = 10;
const MAX_SIGNATURE_POINTS = 2_000;
const PAD_TTL_MS = 30 * 24 * 60 * 60 * 1_000;

if (!keyPath || !certificatePath || !existsSync(keyPath) || !existsSync(certificatePath)) {
  console.error("Signlocal LAN Companion benötigt SIGNLOCAL_TLS_KEY und SIGNLOCAL_TLS_CERT. Ohne lokal vertrauenswürdiges TLS-Zertifikat wird der strenge WLAN-Prototyp nicht gestartet.");
  process.exit(1);
}

function localAddress() {
  const interfaces = Object.values(networkInterfaces()).flat().filter(Boolean);
  const address = interfaces.find((entry) => entry.family === "IPv4" && !entry.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address));
  if (!address) throw new Error("Keine private IPv4-Adresse gefunden. Verbinde den Computer zuerst mit einem privaten WLAN.");
  return address.address;
}

function isPrivateOrLoopbackIpv4(value) { return /^(127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(value); }
function isExactHttpsOrigin(value) { try { const url = new URL(value); return url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash; } catch { return false; } }
function randomToken() { return randomBytes(32).toString("base64url"); }
function isSignaturePoint(point) { return Array.isArray(point) && point.length === 2 && point.every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1); }
async function readRequestJson(request) {
  let body = "";
  for await (const chunk of request) { body += chunk; if (body.length > 8_192) throw new Error("Anfrage zu groß"); }
  if (!body) return {};
  try { const value = JSON.parse(body); return value && typeof value === "object" ? value : {}; } catch { return {}; }
}
function signatureDetails(value) {
  const details = value?.signatureDetails && typeof value.signatureDetails === "object" ? value.signatureDetails : {};
  const showDate = details.showDate !== false;
  return { signerName: typeof details.signerName === "string" ? details.signerName.trim().slice(0, 80) : "", signedPlace: typeof details.signedPlace === "string" ? details.signedPlace.trim().slice(0, 80) : "", showDate, dateFormat: ["de", "iso", "long"].includes(details.dateFormat) ? details.dateFormat : "de", signedAt: showDate ? new Date().toISOString() : null };
}
function normalizeSignatureStrokes(value) {
  if (!Array.isArray(value)) return [];
  const rawStrokes = value.every(isSignaturePoint) ? [value] : value.filter(Array.isArray);
  const strokes = []; let count = 0;
  for (const rawStroke of rawStrokes) {
    const stroke = [];
    for (const point of rawStroke) { if (!isSignaturePoint(point) || count >= MAX_SIGNATURE_POINTS) continue; stroke.push(point); count += 1; }
    if (stroke.length) strokes.push(stroke);
    if (count >= MAX_SIGNATURE_POINTS) break;
  }
  return strokes;
}

const publicHost = process.env.SIGNLOCAL_HOST ?? localAddress();
const publicOrigin = `https://${publicHost}:${port}`;
const allowedWebOrigin = process.env.SIGNLOCAL_ALLOWED_ORIGIN;
const allowOriginlessTestClients = process.env.SIGNLOCAL_ALLOW_ORIGINLESS_TESTS === "1";
const caDownloadEnabled = process.env.SIGNLOCAL_CA_DOWNLOAD === "1";
const caDownloadPort = Number(process.env.SIGNLOCAL_CA_DOWNLOAD_PORT ?? port + 1);
const caDownloadPath = process.env.SIGNLOCAL_CA_FILE;
const caDownloadOrigin = `http://${publicHost}:${caDownloadPort}`;
const caDownloadFileName = "Signlocal-Local-CA.pem";
const padStatePath = process.env.SIGNLOCAL_PAD_STATE_FILE ?? join(root, ".signlocal-office-pads.json");
const caCertificate = caDownloadEnabled ? (caDownloadPath && existsSync(caDownloadPath) ? readFileSync(caDownloadPath) : null) : null;
const caFingerprint = caCertificate ? (createHash("sha256").update(caCertificate).digest("hex").toUpperCase().match(/.{1,2}/g) ?? []).join(":") : null;
const sessions = new Map();
const pads = new Map();
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024, perMessageDeflate: false });

function persistPads() {
  const now = Date.now();
  const durablePads = Array.from(pads.values()).filter((pad) => pad.expiresAt > now).map((pad) => ({ id: pad.id, token: pad.token, expiresAt: pad.expiresAt, trusted: Boolean(pad.trusted), trustedAt: pad.trustedAt ?? null }));
  const temporaryPath = `${padStatePath}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify({ version: 1, pads: durablePads }), { mode: 0o600 });
  renameSync(temporaryPath, padStatePath);
}

function loadPads() {
  if (!existsSync(padStatePath)) return;
  try {
    const saved = JSON.parse(readFileSync(padStatePath, "utf8"));
    const now = Date.now();
    const restored = Array.isArray(saved?.pads) ? saved.pads : [];
    for (const pad of restored) {
      if (typeof pad?.id !== "string" || typeof pad?.token !== "string" || !Number.isFinite(pad?.expiresAt) || pad.expiresAt <= now) continue;
      pads.set(pad.id, { id: pad.id, token: pad.token, expiresAt: pad.expiresAt, socket: null, activeSessionId: null, trusted: Boolean(pad.trusted), trustedAt: Number.isFinite(pad.trustedAt) ? pad.trustedAt : null });
    }
    persistPads();
  } catch {
    console.error("Die lokale Büro-Pad-Bindung konnte nicht gelesen werden. Eine neue Pad-Vorbereitung ist erforderlich.");
  }
}

if (!isPrivateOrLoopbackIpv4(publicHost)) { console.error("SIGNLOCAL_HOST muss eine private IPv4-Adresse sein. Öffentliche oder unklare Hosts werden nicht akzeptiert."); process.exit(1); }
if (allowedWebOrigin && !isExactHttpsOrigin(allowedWebOrigin)) { console.error("SIGNLOCAL_ALLOWED_ORIGIN muss eine exakte HTTPS-Herkunft ohne Pfad enthalten."); process.exit(1); }
if (caDownloadEnabled && !caCertificate) { console.error("SIGNLOCAL_CA_DOWNLOAD=1 benötigt eine lesbare öffentliche CA-Datei in SIGNLOCAL_CA_FILE. Private Schlüssel werden niemals über den Einrichtungsdienst ausgeliefert."); process.exit(1); }
if (caDownloadEnabled && (!Number.isInteger(caDownloadPort) || caDownloadPort < 1 || caDownloadPort > 65_535 || caDownloadPort === port)) { console.error("SIGNLOCAL_CA_DOWNLOAD_PORT muss ein freier TCP-Port zwischen 1 und 65535 sein und darf nicht dem HTTPS-Port des Companion entsprechen."); process.exit(1); }

function send(socket, payload) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload)); }
function isAllowedOrigin(request) { const requestOrigin = request.headers.origin; return requestOrigin ? requestOrigin === publicOrigin || requestOrigin === allowedWebOrigin : allowOriginlessTestClients; }
function corsHeaders(request) {
  if (!allowedWebOrigin || request.headers.origin !== allowedWebOrigin) return {};
  const headers = { "Access-Control-Allow-Origin": allowedWebOrigin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
  if (request.headers["access-control-request-private-network"] === "true") headers["Access-Control-Allow-Private-Network"] = "true";
  return headers;
}

function broadcastConfirmation(session) {
  const payload = { type: "confirmation", desktopConfirmed: session.desktopConfirmed, mobileConfirmed: session.mobileConfirmed };
  send(session.desktop, payload); send(session.mobile, payload);
  if (session.desktopConfirmed && session.mobileConfirmed) {
    if (session.pad) { session.pad.trusted = true; session.pad.trustedAt = Date.now(); persistPads(); }
    send(session.desktop, { type: "ready" }); send(session.mobile, { type: "ready" });
  }
}

function closeSession(session, mobileMessage = "finished") {
  if (!session || session.closed) return;
  session.closed = true; sessions.delete(session.id);
  if (session.pad) {
    if (session.pad.activeSessionId === session.id) { session.pad.activeSessionId = null; if (mobileMessage === "expired") { session.pad.trusted = false; session.pad.trustedAt = null; } send(session.pad.socket, { type: mobileMessage }); }
  } else {
    send(session.mobile, { type: mobileMessage }); session.mobile?.close(1000, "Sitzung beendet");
  }
  session.desktop?.close(1000, "Sitzung beendet");
}

function finishMobileSignature(session) {
  if (!session || session.closed || !session.delivered) return;
  session.closed = true;
  sessions.delete(session.id);
  const padTrusted = session.pad ? Boolean(session.pad.trusted) : session.desktopConfirmed && session.mobileConfirmed;
  if (session.pad) {
    if (session.pad.activeSessionId === session.id) session.pad.activeSessionId = null;
    send(session.pad.socket, { type: "finished" });
  } else {
    const pad = { id: randomToken(), token: randomToken(), expiresAt: Date.now() + PAD_TTL_MS, socket: session.mobile, activeSessionId: null, trusted: session.desktopConfirmed && session.mobileConfirmed, trustedAt: session.desktopConfirmed && session.mobileConfirmed ? Date.now() : null };
    const mobileSocket = session.mobile;
    pads.set(pad.id, pad);
    send(mobileSocket, { type: "become-pad", pad: pad.id, padToken: pad.token, expiresAt: pad.expiresAt, trusted: pad.trusted });
  }
  send(session.desktop, { type: "mobile-finished", officePadReady: true, padTrusted });
}

function cancelMobileSignature(session) {
  if (!session || session.closed) return;
  session.closed = true; sessions.delete(session.id);
  const padTrusted = Boolean(session.pad?.trusted);
  if (session.pad) {
    if (session.pad.activeSessionId === session.id) session.pad.activeSessionId = null;
    send(session.pad.socket, { type: "cancelled" });
  } else {
    const pad = { id: randomToken(), token: randomToken(), expiresAt: Date.now() + PAD_TTL_MS, socket: session.mobile, activeSessionId: null, trusted: session.desktopConfirmed && session.mobileConfirmed, trustedAt: session.desktopConfirmed && session.mobileConfirmed ? Date.now() : null };
    pads.set(pad.id, pad);
    send(session.mobile, { type: "become-pad", pad: pad.id, padToken: pad.token, expiresAt: pad.expiresAt, cancelled: true, trusted: pad.trusted });
  }
  send(session.desktop, { type: "mobile-cancelled", officePadReady: true, padTrusted });
}

function readyPad() {
  for (const pad of pads.values()) if (pad.expiresAt > Date.now() && !pad.activeSessionId && pad.socket?.readyState === WebSocket.OPEN) return pad;
  return null;
}

function sendActivePadRequest(pad) {
  const session = pad.activeSessionId ? sessions.get(pad.activeSessionId) : null;
  if (!session || session.closed || session.expiresAt < Date.now()) return;
  session.mobile = pad.socket;
  session.desktopConfirmed = Boolean(pad.trusted);
  session.mobileConfirmed = Boolean(pad.trusted);
  send(pad.socket, { type: "sign-request", session: session.id, token: session.token, verificationCode: session.verificationCode, expiresAt: session.expiresAt, padTrusted: Boolean(pad.trusted) });
  if (pad.trusted) send(session.desktop, { type: "ready" });
}

function handleMobilePayload(socket, session, payload) {
  if (payload.type === "confirm-code") {
    if (payload.verificationCode !== session.verificationCode) return send(socket, { type: "error", message: "Der Vergleichscode stimmt nicht mit dieser Sitzung überein." });
    session.mobileConfirmed = true; broadcastConfirmation(session); return;
  }
  if (payload.type === "signature") {
    const signatureStrokes = normalizeSignatureStrokes(payload.points);
    if (!signatureStrokes.length) return;
    if (!session.desktopConfirmed || !session.mobileConfirmed) return send(socket, { type: "error", message: "Bestätige zuerst den Vergleichscode auf beiden Geräten." });
    if (session.delivered) return send(socket, { type: "error", message: "Diese Sitzung hat bereits eine Signatur übertragen. Starte für eine weitere Unterschrift eine neue Sitzung." });
    const details = session.signatureDetails;
    session.delivered = true;
    send(session.desktop, { type: "signature", points: signatureStrokes, color: payload.color === "#a4483d" ? payload.color : "#155e63", ...details, verificationCode: session.verificationCode });
    send(socket, { type: "delivered" });
    finishMobileSignature(session);
  }
  if (payload.type === "cancel") cancelMobileSignature(session);
}

function staticFile(response, relativePath, contentType) {
  const path = join(root, "public", relativePath);
  if (!existsSync(path)) { response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); response.end("Lokale Companion-Datei fehlt. Installiere das aktuelle SignLocal-Companion-Paket erneut."); return; }
  response.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' wss:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
  response.end(readFileSync(path));
}

async function sendCaSetupPage(response) {
  const certificateUrl = `${caDownloadOrigin}/${caDownloadFileName}`;
  const certificateQrCode = await QRCode.toDataURL(certificateUrl, { errorCorrectionLevel: "M", margin: 1, width: 420 });
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
  response.end(`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Signlocal CA einrichten</title><style>body{margin:0;background:#f7f3e9;color:#183234;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}main{max-width:640px;margin:auto;padding:32px 20px 64px}.eyebrow{color:#155e63;font-size:.72rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{font:700 clamp(2rem,8vw,3.4rem)/1.05 Georgia,serif;margin:.4rem 0 1rem}.card{margin-top:20px;padding:22px;border:1px solid #d8d3c9;border-radius:22px;background:#fffdf8}.button{display:inline-block;margin-top:12px;padding:15px 18px;border-radius:14px;background:#155e63;color:#fff;text-decoration:none;font-weight:800}.qr{display:block;width:min(100%,320px);margin:16px auto 0;padding:10px;border-radius:18px;background:#fff;box-shadow:0 8px 18px #18323412}.fingerprint{overflow-wrap:anywhere;border-radius:12px;background:#eef2e9;padding:12px;font:600 .78rem/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}.warn{border-left:4px solid #a4483d;padding-left:14px;color:#5f3832}</style><main><p class="eyebrow">Nur im privaten WLAN</p><h1>Signlocal-CA auf diesem iPad einrichten</h1><p>Diese Seite liefert ausschließlich das <strong>öffentliche</strong> lokale CA-Zertifikat. Sie wird nur vom Companion-Computer im privaten WLAN bereitgestellt.</p><section class="card"><p class="eyebrow">1. Zertifikat laden</p><a class="button" href="/${caDownloadFileName}" download>Öffentliches CA-Zertifikat laden</a><p>Scanne diesen QR-Code mit der Kamera eines weiteren eigenen iPads oder iPhones, um den direkten lokalen Zertifikatsdownload zu öffnen:</p><img class="qr" src="${certificateQrCode}" alt="QR-Code zum direkten Download des öffentlichen Signlocal-CA-Zertifikats"><p>Installiere die geladene Datei danach als Profil in den iPad-Einstellungen und aktiviere anschließend die vollständige Vertrauensfreigabe.</p></section><section class="card"><p class="eyebrow">2. Fingerabdruck vergleichen</p><p>Vergleiche diesen Wert mit dem Fingerabdruck auf dem Computer, bevor du das Zertifikat vertraust:</p><p class="fingerprint">SHA-256: ${caFingerprint}</p></section><section class="card warn"><strong>Grenze der Ersteinrichtung:</strong> Diese Downloadseite verwendet absichtlich lokales HTTP, weil das iPad der lokalen CA vor der Installation noch nicht vertrauen kann. Sie ist nur mit <code>SIGNLOCAL_CA_DOWNLOAD=1</code> verfügbar, liefert weder PDF- noch Signaturdaten und stellt niemals einen privaten Schlüssel bereit. Nach der Einrichtung erfolgt die Signaturkopplung ausschließlich über HTTPS.</section></main></html>`);
}

function startCaDownloadServer() {
  if (!caDownloadEnabled) return;
  const setupServer = createHttpServer((request, response) => {
    const url = new URL(request.url ?? "/", caDownloadOrigin);
    if (request.method !== "GET") { response.writeHead(405, { Allow: "GET", "Cache-Control": "no-store" }); response.end("Methode nicht erlaubt"); return; }
    if (url.pathname === "/" || url.pathname === "/ca-setup.html") return sendCaSetupPage(response);
    if (url.pathname === `/${caDownloadFileName}`) { response.writeHead(200, { "Content-Type": "application/x-x509-ca-cert", "Content-Disposition": `attachment; filename="${caDownloadFileName}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); response.end(caCertificate); return; }
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }); response.end("Nicht gefunden");
  });
  setupServer.listen(caDownloadPort, publicHost, () => { console.log(`Signlocal CA-Einrichtung läuft lokal unter ${caDownloadOrigin}/ca-setup.html`); console.log(`CA-Fingerabdruck (SHA-256): ${caFingerprint}`); });
}

const server = createServer({ key: readFileSync(keyPath), cert: readFileSync(certificatePath) }, async (request, response) => {
  const url = new URL(request.url ?? "/", publicOrigin);
  if (request.method === "OPTIONS" && (url.pathname === "/api/sessions" || url.pathname === "/api/pads" || url.pathname === "/api/pad-status")) { response.writeHead(204, corsHeaders(request)); response.end(); return; }
  if (request.method === "POST" && url.pathname === "/api/pads") {
    if (!isAllowedOrigin(request)) { response.writeHead(403, { "Content-Type": "application/json" }); response.end(JSON.stringify({ error: "Diese Herkunft darf kein lokales Büro-Signaturpad vorbereiten." })); return; }
    for (const existingPad of pads.values()) existingPad.socket?.close(1000, "Anderes Büro-Signaturpad vorbereitet");
    pads.clear();
    const id = randomToken(); const token = randomToken(); const expiresAt = Date.now() + PAD_TTL_MS;
    pads.set(id, { id, token, expiresAt, socket: null, activeSessionId: null, trusted: false, trustedAt: null });
    persistPads();
    const padUrl = `${publicOrigin}/mobile.html?pad=${encodeURIComponent(id)}&padToken=${encodeURIComponent(token)}`;
    const padQrCode = await QRCode.toDataURL(padUrl, { errorCorrectionLevel: "M", margin: 1, width: 360 });
    response.writeHead(201, { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(request) }); response.end(JSON.stringify({ id, token, expiresAt, padUrl, padQrCode })); return;
  }
  if (request.method === "POST" && url.pathname === "/api/sessions") {
    if (!isAllowedOrigin(request)) { response.writeHead(403, { "Content-Type": "application/json" }); response.end(JSON.stringify({ error: "Diese Herkunft darf keine lokale Signatursitzung erstellen." })); return; }
    for (const session of sessions.values()) if (session.expiresAt < Date.now()) closeSession(session, "expired");
    if (sessions.size >= MAX_ACTIVE_SESSIONS) { response.writeHead(429, { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(request) }); response.end(JSON.stringify({ error: "Zu viele parallele lokale Signatursitzungen. Beende oder warte auf eine bestehende Sitzung." })); return; }
    const requestBody = await readRequestJson(request).catch(() => ({}));
    const id = randomToken(); const token = randomToken(); const verificationCode = String(randomInt(100000, 1000000)); const pad = readyPad(); const padTrusted = Boolean(pad?.trusted);
    const session = { id, token, verificationCode, expiresAt: Date.now() + 5 * 60_000, desktop: null, mobile: pad?.socket ?? null, pad, signatureDetails: signatureDetails(requestBody), desktopConfirmed: padTrusted, mobileConfirmed: padTrusted, delivered: false, closed: false };
    sessions.set(id, session);
    if (pad) { pad.activeSessionId = id; send(pad.socket, { type: "sign-request", session: id, token, verificationCode, expiresAt: session.expiresAt, padTrusted }); }
    const mobileUrl = `${publicOrigin}/mobile.html?session=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
    const qrCode = await QRCode.toDataURL(mobileUrl, { errorCorrectionLevel: "M", margin: 1, width: 360 });
    response.writeHead(201, { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(request) }); response.end(JSON.stringify({ id, token, verificationCode, expiresAt: session.expiresAt, mobileUrl, qrCode, padReady: Boolean(pad), padTrusted })); return;
  }
  if (request.method === "GET" && url.pathname === "/api/pad-status") {
    if (!isAllowedOrigin(request)) { response.writeHead(403, { "Content-Type": "application/json", "Cache-Control": "no-store" }); response.end(JSON.stringify({ error: "Diese Herkunft darf den Status eines lokalen Büro-Signaturpads nicht lesen." })); return; }
    const pad = readyPad();
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(request) }); response.end(JSON.stringify({ ready: Boolean(pad), trusted: Boolean(pad?.trusted), expiresAt: pad?.expiresAt ?? null })); return;
  }
  if (request.method === "GET" && url.pathname === "/") return staticFile(response, "index.html", "text/html; charset=utf-8");
  if (request.method === "GET" && url.pathname === "/mobile.html") return staticFile(response, "mobile.html", "text/html; charset=utf-8");
  if (request.method === "GET" && url.pathname === "/desktop.js") return staticFile(response, "desktop.js", "text/javascript; charset=utf-8");
  if (request.method === "GET" && url.pathname === "/mobile.js") return staticFile(response, "mobile.js", "text/javascript; charset=utf-8");
  if (request.method === "GET" && url.pathname === "/app.css") return staticFile(response, "app.css", "text/css; charset=utf-8");
  if (request.method === "GET" && url.pathname === "/api/ca-setup") { const qrCode = caDownloadEnabled ? await QRCode.toDataURL(`${caDownloadOrigin}/ca-setup.html`, { errorCorrectionLevel: "M", margin: 1, width: 300 }) : null; response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); response.end(JSON.stringify({ enabled: caDownloadEnabled, setupUrl: caDownloadEnabled ? `${caDownloadOrigin}/ca-setup.html` : null, fingerprint: caFingerprint, qrCode })); return; }
  response.writeHead(404, { "Content-Type": "text/plain" }); response.end("Nicht gefunden");
});

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", publicOrigin); const role = url.searchParams.get("role");
  if (!isAllowedOrigin(request)) return socket.destroy();
  if (role === "pad") {
    const pad = pads.get(url.searchParams.get("pad"));
    if (!pad || pad.expiresAt < Date.now() || pad.token !== url.searchParams.get("padToken")) return socket.destroy();
    return wss.handleUpgrade(request, socket, head, (websocket) => wss.emit("connection", websocket, { kind: "pad", pad }));
  }
  if (url.pathname !== "/signal" || !["desktop", "mobile"].includes(role ?? "")) return socket.destroy();
  const session = sessions.get(url.searchParams.get("session")); const token = url.searchParams.get("token");
  if (!session || session.closed || session.expiresAt < Date.now() || token !== session.token) return socket.destroy();
  wss.handleUpgrade(request, socket, head, (websocket) => wss.emit("connection", websocket, { kind: "session", session, role }));
});

wss.on("connection", (socket, context) => {
  if (context.kind === "pad") {
    const pad = context.pad; pad.socket?.close(1000, "Neues Büro-Signaturpad verbunden"); pad.socket = socket; pad.expiresAt = Date.now() + PAD_TTL_MS; persistPads(); send(socket, { type: "pad-ready", expiresAt: pad.expiresAt, trusted: Boolean(pad.trusted) }); sendActivePadRequest(pad);
    socket.on("message", (raw) => {
      if (raw.length > 256_000) return socket.close(1009, "Signaturdaten zu groß");
      try { const payload = JSON.parse(raw.toString()); if (payload.type === "forget-pad") { pads.delete(pad.id); persistPads(); return socket.close(1000, "Büro-Signaturpad bewusst getrennt"); } const session = pad.activeSessionId ? sessions.get(pad.activeSessionId) : null; if (!session) return send(socket, { type: "error", message: "Es liegt derzeit keine lokale Signaturaufforderung vor." }); handleMobilePayload(socket, session, payload); } catch { socket.close(1003, "Ungültige Sitzungsdaten"); }
    });
    socket.on("close", () => {
      if (pad.socket !== socket) return; pad.socket = null;
      const session = pad.activeSessionId ? sessions.get(pad.activeSessionId) : null;
      if (session && !session.closed) { session.mobile = null; session.mobileConfirmed = false; send(session.desktop, { type: "disconnected", role: "mobile" }); broadcastConfirmation(session); }
    });
    return;
  }
  const { session, role } = context;
  if (role === "desktop") { session.desktop?.close(1000, "Neue Desktop-Sitzung"); session.desktop = socket; if (session.mobile) send(socket, { type: "paired", verificationCode: session.verificationCode }); }
  else {
    if (session.pad?.activeSessionId === session.id) session.pad.activeSessionId = null;
    session.pad = null;
    session.mobile?.close(1000, "Neues Mobilgerät verbunden");
    session.mobile = socket;
    if (session.desktop) send(session.desktop, { type: "paired", verificationCode: session.verificationCode });
  }
  send(socket, { type: "hello", role, verificationCode: session.verificationCode, expiresAt: session.expiresAt }); broadcastConfirmation(session);
  socket.on("message", (raw) => {
    if (raw.length > 256_000) return socket.close(1009, "Signaturdaten zu groß");
    try {
      const payload = JSON.parse(raw.toString());
      const convertedPad = Array.from(pads.values()).find((pad) => pad.socket === socket);
      if (convertedPad) {
        if (payload.type === "forget-pad") { pads.delete(convertedPad.id); persistPads(); return socket.close(1000, "Büro-Signaturpad bewusst getrennt"); }
        const activeSession = convertedPad.activeSessionId ? sessions.get(convertedPad.activeSessionId) : null;
        if (!activeSession) return send(socket, { type: "error", message: "Es liegt derzeit keine lokale Signaturaufforderung vor." });
        return handleMobilePayload(socket, activeSession, payload);
      }
      if (role === "desktop" && payload.type === "finish") return closeSession(session);
      if (payload.type === "confirm-code") {
        if (payload.verificationCode !== session.verificationCode) return send(socket, { type: "error", message: "Der Vergleichscode stimmt nicht mit dieser Sitzung überein." });
        session[`${role}Confirmed`] = true;
        broadcastConfirmation(session);
        return;
      }
      if (role === "mobile") handleMobilePayload(socket, session, payload);
    } catch { socket.close(1003, "Ungültige Sitzungsdaten"); }
  });
  socket.on("close", () => {
    const convertedPad = Array.from(pads.values()).find((pad) => pad.socket === socket);
    if (convertedPad) {
      convertedPad.socket = null;
      const activeSession = convertedPad.activeSessionId ? sessions.get(convertedPad.activeSessionId) : null;
      if (activeSession && !activeSession.closed) { activeSession.mobile = null; activeSession.mobileConfirmed = false; send(activeSession.desktop, { type: "disconnected", role: "mobile" }); broadcastConfirmation(activeSession); }
      return;
    }
    if (session.closed || session[role] !== socket) return;
    session[role] = null; session[`${role}Confirmed`] = false;
    send(role === "desktop" ? session.mobile : session.desktop, { type: "disconnected", role }); broadcastConfirmation(session);
  });
});

setInterval(() => {
  for (const session of sessions.values()) if (session.expiresAt < Date.now()) closeSession(session, "expired");
  let removedExpiredPad = false;
  for (const [id, pad] of pads) if (pad.expiresAt < Date.now()) { pad.socket?.close(1000, "Büro-Signaturpad abgelaufen"); pads.delete(id); removedExpiredPad = true; }
  if (removedExpiredPad) persistPads();
}, 15_000).unref();

loadPads();
server.listen(port, publicHost, () => { console.log(`Signlocal LAN Companion läuft nur lokal unter ${publicOrigin}`); console.log("Öffne die PDF-App, starte die lokale Sitzung, scanne den QR-Code oder nutze ein bereits bereitstehendes Büro-Signaturpad und bestätige den sechsstelligen Code auf beiden Geräten."); if (!allowedWebOrigin) console.log("Hinweis: Für die Übergabe an die veröffentlichte PDF-App SIGNLOCAL_ALLOWED_ORIGIN auf deren HTTPS-Adresse setzen."); });
startCaDownloadServer();
