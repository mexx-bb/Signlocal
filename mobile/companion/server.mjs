// Signlocal LAN Companion Prototype: local TLS, single-use QR pairing and in-memory signature relay only.
import { createServer } from "node:https";
import { existsSync, readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes, randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { WebSocket, WebSocketServer } from "ws";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.SIGNLOCAL_PORT ?? 8787);
const keyPath = process.env.SIGNLOCAL_TLS_KEY;
const certificatePath = process.env.SIGNLOCAL_TLS_CERT;

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

function randomToken() {
  return randomBytes(32).toString("base64url");
}

const publicHost = process.env.SIGNLOCAL_HOST ?? localAddress();
const publicOrigin = `https://${publicHost}:${port}`;
const allowedWebOrigin = process.env.SIGNLOCAL_ALLOWED_ORIGIN;
const sessions = new Map();
const wss = new WebSocketServer({ noServer: true });

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
  return !requestOrigin || requestOrigin === publicOrigin || requestOrigin === allowedWebOrigin;
}

function corsHeaders(request) {
  return request.headers.origin === allowedWebOrigin ? { "Access-Control-Allow-Origin": allowedWebOrigin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Private-Network": request.headers["access-control-request-private-network"] === "true" ? "true" : undefined, Vary: "Origin" } : {};
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
  response.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
  response.end(readFileSync(path));
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
    const id = randomToken();
    const token = randomToken();
    const session = { id, token, verificationCode: String(randomInt(100000, 1000000)), expiresAt: Date.now() + 5 * 60_000, desktop: null, mobile: null, desktopConfirmed: false, mobileConfirmed: false, closed: false };
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
      if (role === "mobile" && payload.type === "signature" && Array.isArray(payload.points) && payload.points.length > 1) {
        if (!session.desktopConfirmed || !session.mobileConfirmed) return send(socket, { type: "error", message: "Bestätige zuerst den Vergleichscode auf beiden Geräten." });
        const signerName = typeof payload.signerName === "string" ? payload.signerName.trim().slice(0, 80) : "";
        const signedAt = typeof payload.signedAt === "string" && !Number.isNaN(Date.parse(payload.signedAt)) ? payload.signedAt : null;
        send(session.desktop, { type: "signature", points: payload.points.slice(0, 10_000), color: payload.color === "#a4483d" ? payload.color : "#155e63", signerName, signedAt, verificationCode: session.verificationCode });
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

server.listen(port, "0.0.0.0", () => {
  console.log(`Signlocal LAN Companion läuft nur lokal unter ${publicOrigin}`);
  console.log("Öffne die PDF-App, starte die lokale Sitzung, scanne den QR-Code und bestätige den sechsstelligen Code auf beiden Geräten.");
  if (!allowedWebOrigin) console.log("Hinweis: Für die Übergabe an die veröffentlichte PDF-App SIGNLOCAL_ALLOWED_ORIGIN auf deren HTTPS-Adresse setzen.");
});
