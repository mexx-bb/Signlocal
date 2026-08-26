// Signlocal LAN Companion Prototype: local TLS, single-use QR pairing and in-memory signature relay only.
import { createServer } from "node:https";
import { createServer as createHttpServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
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

function isPrivateOrLoopbackIpv4(value) {
  return /^(127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(value);
}

function isExactHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash;
  } catch {
    return false;
  }
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

function isSignaturePoint(point) {
  return Array.isArray(point) && point.length === 2 && point.every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1);
}

function normalizeSignatureStrokes(value) {
  if (!Array.isArray(value)) return [];
  const rawStrokes = value.every(isSignaturePoint) ? [value] : value.filter(Array.isArray);
  const strokes = [];
  let count = 0;
  for (const rawStroke of rawStrokes) {
    const stroke = [];
    for (const point of rawStroke) {
      if (!isSignaturePoint(point) || count >= MAX_SIGNATURE_POINTS) continue;
      stroke.push(point);
      count += 1;
    }
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
const caCertificate = caDownloadEnabled ? (caDownloadPath && existsSync(caDownloadPath) ? readFileSync(caDownloadPath) : null) : null;
const caFingerprint = caCertificate ? (createHash("sha256").update(caCertificate).digest("hex").toUpperCase().match(/.{1,2}/g) ?? []).join(":") : null;
const sessions = new Map();
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024, perMessageDeflate: false });

if (!isPrivateOrLoopbackIpv4(publicHost)) {
  console.error("SIGNLOCAL_HOST muss eine private IPv4-Adresse sein. Öffentliche oder unklare Hosts werden nicht akzeptiert.");
  process.exit(1);
}

if (allowedWebOrigin && !isExactHttpsOrigin(allowedWebOrigin)) {
  console.error("SIGNLOCAL_ALLOWED_ORIGIN muss eine exakte HTTPS-Herkunft ohne Pfad enthalten.");
  process.exit(1);
}

if (caDownloadEnabled && !caCertificate) {
  console.error("SIGNLOCAL_CA_DOWNLOAD=1 benötigt eine lesbare öffentliche CA-Datei in SIGNLOCAL_CA_FILE. Private Schlüssel werden niemals über den Einrichtungsdienst ausgeliefert.");
  process.exit(1);
}

if (caDownloadEnabled && (!Number.isInteger(caDownloadPort) || caDownloadPort < 1 || caDownloadPort > 65_535 || caDownloadPort === port)) {
  console.error("SIGNLOCAL_CA_DOWNLOAD_PORT muss ein freier TCP-Port zwischen 1 und 65535 sein und darf nicht dem HTTPS-Port des Companion entsprechen.");
  process.exit(1);
}

function send(socket, payload) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

function closeSession(session) {
  session.closed = true;
  session.desktop?.close(1000, "Sitzung beendet");
  session.mobile?.close(1000, "Sitzung beendet");
  sessions.delete(session.id);
}

function isAllowedOrigin(request) {
  const requestOrigin = request.headers.origin;
  if (!requestOrigin) return allowOriginlessTestClients;
  return requestOrigin === publicOrigin || requestOrigin === allowedWebOrigin;
}

function corsHeaders(request) {
  if (!allowedWebOrigin || request.headers.origin !== allowedWebOrigin) return {};
  const headers = { "Access-Control-Allow-Origin": allowedWebOrigin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
  if (request.headers["access-control-request-private-network"] === "true") headers["Access-Control-Allow-Private-Network"] = "true";
  return headers;
}

function broadcastConfirmation(session) {
  const payload = { type: "confirmation", desktopConfirmed: session.desktopConfirmed, mobileConfirmed: session.mobileConfirmed };
  send(session.desktop, payload);
  send(session.mobile, payload);
  if (session.desktopConfirmed && session.mobileConfirmed) {
    send(session.desktop, { type: "ready" });
    send(session.mobile, { type: "ready" });
  }
}

function staticFile(response, relativePath, contentType) {
  const path = join(root, "public", relativePath);
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
    if (request.method !== "GET") {
      response.writeHead(405, { Allow: "GET", "Cache-Control": "no-store" });
      response.end("Methode nicht erlaubt");
      return;
    }
    if (url.pathname === "/" || url.pathname === "/ca-setup.html") return sendCaSetupPage(response);
    if (url.pathname === `/${caDownloadFileName}`) {
      response.writeHead(200, { "Content-Type": "application/x-x509-ca-cert", "Content-Disposition": `attachment; filename="${caDownloadFileName}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      response.end(caCertificate);
      return;
    }
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    response.end("Nicht gefunden");
  });
  setupServer.listen(caDownloadPort, publicHost, () => {
    console.log(`Signlocal CA-Einrichtung läuft lokal unter ${caDownloadOrigin}/ca-setup.html`);
    console.log(`CA-Fingerabdruck (SHA-256): ${caFingerprint}`);
  });
}

const server = createServer({ key: readFileSync(keyPath), cert: readFileSync(certificatePath) }, async (request, response) => {
  const url = new URL(request.url ?? "/", publicOrigin);
  if (request.method === "OPTIONS" && url.pathname === "/api/sessions") {
    response.writeHead(204, corsHeaders(request));
    response.end();
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/sessions") {
    if (!isAllowedOrigin(request)) {
      response.writeHead(403, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Diese Herkunft darf keine lokale Signatursitzung erstellen." }));
      return;
    }
    for (const session of sessions.values()) if (session.expiresAt < Date.now()) closeSession(session);
    if (sessions.size >= MAX_ACTIVE_SESSIONS) {
      response.writeHead(429, { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(request) });
      response.end(JSON.stringify({ error: "Zu viele parallele lokale Signatursitzungen. Beende oder warte auf eine bestehende Sitzung." }));
      return;
    }
    const id = randomToken();
    const token = randomToken();
    const session = { id, token, verificationCode: String(randomInt(100000, 1000000)), expiresAt: Date.now() + 5 * 60_000, desktop: null, mobile: null, desktopConfirmed: false, mobileConfirmed: false, delivered: false, closed: false };
    sessions.set(id, session);
    const mobileUrl = `${publicOrigin}/mobile.html?session=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
    const qrCode = await QRCode.toDataURL(mobileUrl, { errorCorrectionLevel: "M", margin: 1, width: 360 });
    response.writeHead(201, { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(request) });
    response.end(JSON.stringify({ id, token, verificationCode: session.verificationCode, expiresAt: session.expiresAt, mobileUrl, qrCode }));
    return;
  }
  if (request.method === "GET" && url.pathname === "/") return staticFile(response, "index.html", "text/html; charset=utf-8");
  if (request.method === "GET" && url.pathname === "/mobile.html") return staticFile(response, "mobile.html", "text/html; charset=utf-8");
  if (request.method === "GET" && url.pathname === "/desktop.js") return staticFile(response, "desktop.js", "text/javascript; charset=utf-8");
  if (request.method === "GET" && url.pathname === "/mobile.js") return staticFile(response, "mobile.js", "text/javascript; charset=utf-8");
  if (request.method === "GET" && url.pathname === "/app.css") return staticFile(response, "app.css", "text/css; charset=utf-8");
  if (request.method === "GET" && url.pathname === "/api/ca-setup") {
    const qrCode = caDownloadEnabled ? await QRCode.toDataURL(`${caDownloadOrigin}/ca-setup.html`, { errorCorrectionLevel: "M", margin: 1, width: 300 }) : null;
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ enabled: caDownloadEnabled, setupUrl: caDownloadEnabled ? `${caDownloadOrigin}/ca-setup.html` : null, fingerprint: caFingerprint, qrCode }));
    return;
  }
  response.writeHead(404, { "Content-Type": "text/plain" });
  response.end("Nicht gefunden");
});

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", publicOrigin);
  if (url.pathname !== "/signal") return socket.destroy();
  const session = sessions.get(url.searchParams.get("session"));
  const token = url.searchParams.get("token");
  const role = url.searchParams.get("role");
  if (!session || session.closed || session.expiresAt < Date.now() || token !== session.token || !["desktop", "mobile"].includes(role) || !isAllowedOrigin(request)) return socket.destroy();
  wss.handleUpgrade(request, socket, head, (websocket) => wss.emit("connection", websocket, { session, role }));
});

wss.on("connection", (socket, { session, role }) => {
  if (role === "desktop") {
    session.desktop?.close(1000, "Neue Desktop-Sitzung");
    session.desktop = socket;
    if (session.mobile) send(socket, { type: "paired", verificationCode: session.verificationCode });
  } else {
    session.mobile?.close(1000, "Neue Mobil-Sitzung");
    session.mobile = socket;
    send(session.desktop, { type: "paired", verificationCode: session.verificationCode });
  }
  send(socket, { type: "hello", role, verificationCode: session.verificationCode, expiresAt: session.expiresAt });
  broadcastConfirmation(session);
  socket.on("message", (raw) => {
    if (raw.length > 256_000) return socket.close(1009, "Signaturdaten zu groß");
    try {
      const payload = JSON.parse(raw.toString());
      if (payload.type === "confirm-code") {
        if (payload.verificationCode !== session.verificationCode) return send(socket, { type: "error", message: "Der Vergleichscode stimmt nicht mit dieser Sitzung überein." });
        session[`${role}Confirmed`] = true;
        broadcastConfirmation(session);
      }
      const signatureStrokes = role === "mobile" && payload.type === "signature" ? normalizeSignatureStrokes(payload.points) : [];
      if (role === "mobile" && payload.type === "signature" && signatureStrokes.length) {
        if (!session.desktopConfirmed || !session.mobileConfirmed) return send(socket, { type: "error", message: "Bestätige zuerst den Vergleichscode auf beiden Geräten." });
        if (session.delivered) return send(socket, { type: "error", message: "Diese Sitzung hat bereits eine Signatur übertragen. Starte für eine weitere Unterschrift eine neue Sitzung." });
        const signerName = typeof payload.signerName === "string" ? payload.signerName.trim().slice(0, 80) : "";
        const signedAt = typeof payload.signedAt === "string" && !Number.isNaN(Date.parse(payload.signedAt)) ? payload.signedAt : null;
        session.delivered = true;
        send(session.desktop, { type: "signature", points: signatureStrokes, color: payload.color === "#a4483d" ? payload.color : "#155e63", signerName, signedAt, verificationCode: session.verificationCode });
        send(socket, { type: "delivered" });
      }
      if (role === "desktop" && payload.type === "finish") {
        send(session.mobile, { type: "finished" });
        closeSession(session);
      }
    } catch {
      socket.close(1003, "Ungültige Sitzungsdaten");
    }
  });
  socket.on("close", () => {
    if (session.closed || session[role] !== socket) return;
    session[role] = null;
    session[`${role}Confirmed`] = false;
    send(role === "desktop" ? session.mobile : session.desktop, { type: "disconnected", role });
    broadcastConfirmation(session);
  });
});

setInterval(() => {
  for (const session of sessions.values()) if (session.expiresAt < Date.now()) closeSession(session);
}, 15_000).unref();

server.listen(port, publicHost, () => {
  console.log(`Signlocal LAN Companion läuft nur lokal unter ${publicOrigin}`);
  console.log("Öffne die PDF-App, starte die lokale Sitzung, scanne den QR-Code und bestätige den sechsstelligen Code auf beiden Geräten.");
  if (!allowedWebOrigin) console.log("Hinweis: Für die Übergabe an die veröffentlichte PDF-App SIGNLOCAL_ALLOWED_ORIGIN auf deren HTTPS-Adresse setzen.");
});

startCaDownloadServer();
