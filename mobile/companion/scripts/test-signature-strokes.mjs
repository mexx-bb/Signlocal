// Isolierter Companion-Test: Ein einzelner Punkt muss als eigener Zeichenstrich sicher weitergereicht werden.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { request } from "node:https";
import { WebSocket } from "ws";

const root = join(import.meta.dirname, "..");
const testRoot = mkdtempSync(join(tmpdir(), "signlocal-stroke-test-"));
const port = 19887;
const cert = join(testRoot, "cert.pem");
const key = join(testRoot, "key.pem");
const ca = join(testRoot, "public-ca.pem");
const testOrigin = "https://signlocal-test.invalid";
let companion;
let desktop;
let mobile;
let companionLog = "";

function stop() {
  desktop?.terminate();
  mobile?.terminate();
  companion?.kill();
  rmSync(testRoot, { recursive: true, force: true });
}

function waitFor(check, label, timeout = 6_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      if (await check()) { clearInterval(timer); resolve(); return; }
      if (Date.now() - started > timeout) { clearInterval(timer); reject(new Error(`Zeitüberschreitung: ${label}. ${companionLog.trim() || "Der Companion hat kein Startprotokoll ausgegeben."}`)); }
    }, 30);
  });
}

function createSession(includeOrigin = true) {
  return new Promise((resolve, reject) => {
    const call = request({ hostname: "127.0.0.1", port, path: "/api/sessions", method: "POST", rejectUnauthorized: false, headers: includeOrigin ? { Origin: testOrigin } : {} }, (response) => {
      let body = "";
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => response.statusCode === 201 ? resolve(JSON.parse(body)) : reject(new Error(`Sitzung konnte nicht erstellt werden (${response.statusCode}).`)));
    });
    call.on("error", reject);
    call.end();
  });
}

try {
  writeFileSync(ca, "isolierte-oeffentliche-ca");
  const certificate = spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-days", "1", "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"], { stdio: "ignore" });
  if (certificate.status !== 0) throw new Error("Temporäres Testzertifikat konnte nicht erzeugt werden.");

  companion = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, SIGNLOCAL_TLS_KEY: key, SIGNLOCAL_TLS_CERT: cert, SIGNLOCAL_HOST: "127.0.0.1", SIGNLOCAL_PORT: String(port), SIGNLOCAL_CA_DOWNLOAD: "0", SIGNLOCAL_ALLOWED_ORIGIN: testOrigin },
    stdio: ["ignore", "pipe", "pipe"],
  });
  companion.stdout.on("data", (chunk) => { companionLog += chunk.toString(); });
  companion.stderr.on("data", (chunk) => { companionLog += chunk.toString(); });
  await waitFor(async () => {
    try { await createSession(); return true; } catch { return false; }
  }, "Companion-Start");

  const session = await createSession();
  await createSession(false).then(() => { throw new Error("Eine Sitzung ohne Origin wurde unerwartet akzeptiert."); }, (error) => { if (!String(error.message).includes("403")) throw error; });
  const endpoint = (role) => `wss://127.0.0.1:${port}/signal?role=${role}&session=${encodeURIComponent(session.id)}&token=${encodeURIComponent(session.token)}`;
  let received;
  let desktopReady = false;
  let mobileReady = false;
  desktop = new WebSocket(endpoint("desktop"), { rejectUnauthorized: false, headers: { Origin: testOrigin } });
  mobile = new WebSocket(endpoint("mobile"), { rejectUnauthorized: false, headers: { Origin: testOrigin } });
  desktop.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.type === "ready") desktopReady = true;
    if (message.type === "signature") received = message;
  });
  mobile.on("message", (raw) => { if (JSON.parse(raw.toString()).type === "ready") mobileReady = true; });

  await Promise.all([new Promise((resolve, reject) => { desktop.once("open", resolve); desktop.once("error", reject); }), new Promise((resolve, reject) => { mobile.once("open", resolve); mobile.once("error", reject); })]);
  desktop.send(JSON.stringify({ type: "confirm-code", verificationCode: session.verificationCode }));
  mobile.send(JSON.stringify({ type: "confirm-code", verificationCode: session.verificationCode }));
  await waitFor(() => desktopReady && mobileReady, "beidseitige Codefreigabe");
  mobile.send(JSON.stringify({ type: "signature", points: [[[0.42, 0.31]]], color: "#155e63" }));
  await waitFor(() => Boolean(received), "Weiterleitung des Einzelpunkts");

  if (JSON.stringify(received.points) !== JSON.stringify([[[0.42, 0.31]]])) throw new Error("Der einzelne Signaturpunkt wurde nicht unverändert weitergereicht.");
  console.log("test-signature-strokes.mjs: Test erfolgreich");
} finally {
  stop();
}
