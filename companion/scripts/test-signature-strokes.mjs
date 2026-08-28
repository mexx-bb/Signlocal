// Companion-Protokolltest: Einzelpunkte sowie der vollständige lokale Büro-Pad-Ablauf bleiben sicher nutzbar.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const padState = join(testRoot, "office-pads.json");
const testOrigin = "https://signlocal-test.invalid";
let companion;
let desktop;
let mobile;
let officePad;
let officeDesktop;
let officeFollowUpDesktop;
let companionLog = "";

function stop() { desktop?.terminate(); mobile?.terminate(); officePad?.terminate(); officeDesktop?.terminate(); officeFollowUpDesktop?.terminate(); companion?.kill(); rmSync(testRoot, { recursive: true, force: true }); }
function waitFor(check, label, timeout = 6_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      if (await check()) { clearInterval(timer); resolve(); return; }
      if (Date.now() - started > timeout) { clearInterval(timer); reject(new Error(`Zeitüberschreitung: ${label}. ${companionLog.trim() || "Der Companion hat kein Startprotokoll ausgegeben."}`)); }
    }, 30);
  });
}
function callApi(path, includeOrigin = true, body) {
  return new Promise((resolve, reject) => {
    const headers = includeOrigin ? { Origin: testOrigin } : {};
    if (body) headers["Content-Type"] = "application/json";
    const call = request({ hostname: "127.0.0.1", port, path, method: "POST", rejectUnauthorized: false, headers }, (response) => {
      let body = "";
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => response.statusCode === 201 ? resolve(JSON.parse(body)) : reject(new Error(`Anfrage ${path} konnte nicht erstellt werden (${response.statusCode}).`)));
    });
    call.on("error", reject); call.end(body ? JSON.stringify(body) : undefined);
  });
}
function readPadStatus() {
  return new Promise((resolve, reject) => {
    const call = request({ hostname: "127.0.0.1", port, path: "/api/pad-status", method: "GET", rejectUnauthorized: false, headers: { Origin: testOrigin } }, (response) => {
      let body = "";
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => response.statusCode === 200 ? resolve(JSON.parse(body)) : reject(new Error(`Pad-Status konnte nicht gelesen werden (${response.statusCode}).`)));
    });
    call.on("error", reject); call.end();
  });
}
function open(socket) { return new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); }); }
function sessionEndpoint(session, role) { return `wss://127.0.0.1:${port}/signal?role=${role}&session=${encodeURIComponent(session.id)}&token=${encodeURIComponent(session.token)}`; }

try {
  writeFileSync(ca, "isolierte-oeffentliche-ca");
  const certificate = spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-days", "1", "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"], { stdio: "ignore" });
  if (certificate.status !== 0) throw new Error("Temporäres Testzertifikat konnte nicht erzeugt werden.");
  companion = spawn(process.execPath, ["server.mjs"], { cwd: root, env: { ...process.env, SIGNLOCAL_TLS_KEY: key, SIGNLOCAL_TLS_CERT: cert, SIGNLOCAL_HOST: "127.0.0.1", SIGNLOCAL_PORT: String(port), SIGNLOCAL_CA_DOWNLOAD: "0", SIGNLOCAL_ALLOWED_ORIGIN: testOrigin, SIGNLOCAL_PAD_STATE_FILE: padState }, stdio: ["ignore", "pipe", "pipe"] });
  companion.stdout.on("data", (chunk) => { companionLog += chunk.toString(); }); companion.stderr.on("data", (chunk) => { companionLog += chunk.toString(); });
  await waitFor(async () => { try { await callApi("/api/sessions"); return true; } catch { return false; } }, "Companion-Start");

  const session = await callApi("/api/sessions", true, { signatureDetails: { signerName: "Mara Beispiel", signedPlace: "Münster", showDate: true, dateFormat: "long" } });
  await callApi("/api/sessions", false).then(() => { throw new Error("Eine Sitzung ohne Origin wurde unerwartet akzeptiert."); }, (error) => { if (!String(error.message).includes("403")) throw error; });
  let received; let desktopReady = false; let mobileReady = false; let mobileBecamePad = false;
  desktop = new WebSocket(sessionEndpoint(session, "desktop"), { rejectUnauthorized: false, headers: { Origin: testOrigin } });
  mobile = new WebSocket(sessionEndpoint(session, "mobile"), { rejectUnauthorized: false, headers: { Origin: testOrigin } });
  desktop.on("message", (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "ready") desktopReady = true; if (message.type === "signature") received = message; });
  mobile.on("message", (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "ready") mobileReady = true; if (message.type === "become-pad") mobileBecamePad = true; });
  await Promise.all([open(desktop), open(mobile)]);
  desktop.send(JSON.stringify({ type: "confirm-code", verificationCode: session.verificationCode })); mobile.send(JSON.stringify({ type: "confirm-code", verificationCode: session.verificationCode }));
  await waitFor(() => desktopReady && mobileReady, "beidseitige Codefreigabe");
  mobile.send(JSON.stringify({ type: "signature", points: [[[0.42, 0.31]]], color: "#155e63" }));
  await waitFor(() => Boolean(received), "Weiterleitung des Einzelpunkts");
  if (JSON.stringify(received.points) !== JSON.stringify([[[0.42, 0.31]]])) throw new Error("Der einzelne Signaturpunkt wurde nicht unverändert weitergereicht.");
  if (received.signerName !== "Mara Beispiel" || received.signedPlace !== "Münster" || received.dateFormat !== "long" || !received.signedAt) throw new Error("Die optionalen Angaben vom Computer wurden nicht vollständig mit der lokalen Signatur übertragen.");
  mobile.send(JSON.stringify({ type: "finish" }));
  await waitFor(() => mobileBecamePad, "Umwandlung des Mobilgeräts in ein Büro-Pad");

  let followUpRequest; let followUpReceived; let followUpReady = false;
  mobile.on("message", (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "sign-request") followUpRequest = message; if (message.type === "ready") followUpReady = true; });
  const followUpSession = await callApi("/api/sessions");
  if (!followUpSession.padReady) throw new Error("Das Mobilgerät wurde nach „Fertig“ nicht für eine direkte Folgeanforderung bereitgehalten.");
  if (!followUpSession.padTrusted) throw new Error("Die zuvor bestätigte Pad-Bindung wurde nicht für die direkte Folgeanforderung wiederverwendet.");
  const followUpDesktop = new WebSocket(sessionEndpoint(followUpSession, "desktop"), { rejectUnauthorized: false, headers: { Origin: testOrigin } });
  followUpDesktop.on("message", (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "ready") followUpReady = true; if (message.type === "signature") followUpReceived = message; });
  await open(followUpDesktop); await waitFor(() => followUpRequest?.session === followUpSession.id, "direkte Folgeanforderung ohne QR-Scan");
  if (!followUpRequest.padTrusted) throw new Error("Das Mobilgerät wurde bei einer bestätigten Folgeanforderung erneut zur Codeprüfung aufgefordert.");
  await waitFor(() => followUpReady, "automatische Freigabe für bestätigte Folgeanforderung");
  mobile.send(JSON.stringify({ type: "signature", points: [[[0.66, 0.18]]], color: "#155e63" }));
  await waitFor(() => Boolean(followUpReceived), "zweite Mobil-Signatur ohne QR-Scan");
  if (JSON.stringify(followUpReceived.points) !== JSON.stringify([[[0.66, 0.18]]])) throw new Error("Die Folge-Signatur wurde nicht unverändert weitergereicht.");
  followUpDesktop.terminate();
  mobile.terminate();
  await new Promise((resolve) => setTimeout(resolve, 80));

  const pad = await callApi("/api/pads");
  let padReady = false; let signRequest; let officeReceived; let officeReady = false; let officeFinished = false; let officeFollowUpRequest; let officeFollowUpReceived; let officeFollowUpReady = false;
  officePad = new WebSocket(`wss://127.0.0.1:${port}/signal?role=pad&pad=${encodeURIComponent(pad.id)}&padToken=${encodeURIComponent(pad.token)}`, { rejectUnauthorized: false, headers: { Origin: testOrigin } });
  officePad.on("message", (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "pad-ready") padReady = true; if (message.type === "sign-request") { if (signRequest) officeFollowUpRequest = message; else signRequest = message; } if (message.type === "ready") { if (officeFollowUpRequest) officeFollowUpReady = true; else officeReady = true; } });
  await open(officePad); await waitFor(() => padReady, "Büro-Pad-Bereitschaft");
  const officeSession = await callApi("/api/sessions");
  if (!officeSession.padReady) throw new Error("Die lokale Sitzung hat das bereitstehende Büro-Pad nicht erkannt.");
  if (officeSession.padTrusted) throw new Error("Ein neu vorbereitetes Büro-Pad darf nicht ohne erste Codebestätigung vertraut werden.");
  officeDesktop = new WebSocket(sessionEndpoint(officeSession, "desktop"), { rejectUnauthorized: false, headers: { Origin: testOrigin } });
  officeDesktop.on("message", (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "ready") officeReady = true; if (message.type === "signature") officeReceived = message; if (message.type === "mobile-finished") officeFinished = true; });
  await open(officeDesktop); await waitFor(() => signRequest?.session === officeSession.id, "sichtbare lokale Signaturaufforderung");
  officeDesktop.send(JSON.stringify({ type: "confirm-code", verificationCode: officeSession.verificationCode })); officePad.send(JSON.stringify({ type: "confirm-code", verificationCode: signRequest.verificationCode }));
  await waitFor(() => officeReady, "Codefreigabe am Büro-Pad");
  officePad.send(JSON.stringify({ type: "signature", points: [[[0.19, 0.61]]], color: "#155e63" }));
  await waitFor(() => Boolean(officeReceived), "Signaturübertragung vom Büro-Pad");
  if (JSON.stringify(officeReceived.points) !== JSON.stringify([[[0.19, 0.61]]])) throw new Error("Die Büro-Pad-Signatur wurde nicht unverändert weitergereicht.");
  officePad.send(JSON.stringify({ type: "finish" }));
  await waitFor(() => officeFinished, "Abschluss Fertig am Büro-Pad");
  const officeFollowUpSession = await callApi("/api/sessions");
  if (!officeFollowUpSession.padReady || !officeFollowUpSession.padTrusted) throw new Error("Die bestätigte Büro-Pad-Bindung wurde nicht für eine direkte Folgeunterschrift bewahrt.");
  officeFollowUpDesktop = new WebSocket(sessionEndpoint(officeFollowUpSession, "desktop"), { rejectUnauthorized: false, headers: { Origin: testOrigin } });
  officeFollowUpDesktop.on("message", (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "ready") officeFollowUpReady = true; if (message.type === "signature") officeFollowUpReceived = message; });
  await open(officeFollowUpDesktop); await waitFor(() => officeFollowUpRequest?.session === officeFollowUpSession.id, "Folgeaufforderung am bestätigten Büro-Pad");
  if (!officeFollowUpRequest.padTrusted) throw new Error("Die Folgeaufforderung am bestätigten Büro-Pad verlangt weiterhin einen Codevergleich.");
  await waitFor(() => officeFollowUpReady, "automatische Freigabe am bestätigten Büro-Pad");
  officePad.send(JSON.stringify({ type: "signature", points: [[[0.81, 0.25]]], color: "#155e63" }));
  await waitFor(() => Boolean(officeFollowUpReceived), "zweite Signatur am bestätigten Büro-Pad");
  if (JSON.stringify(officeFollowUpReceived.points) !== JSON.stringify([[[0.81, 0.25]]])) throw new Error("Die Folge-Signatur vom bestätigten Büro-Pad wurde nicht unverändert weitergereicht.");
  if (!existsSync(padState) || !JSON.parse(readFileSync(padState, "utf8")).pads?.some((entry) => entry.id === pad.id && entry.trusted)) throw new Error("Die bestätigte Büro-Pad-Bindung wurde nicht lokal und geschützt für einen Companion-Neustart vorgemerkt.");

  officePad.terminate(); companion.kill();
  await new Promise((resolve) => setTimeout(resolve, 160));
  companion = spawn(process.execPath, ["server.mjs"], { cwd: root, env: { ...process.env, SIGNLOCAL_TLS_KEY: key, SIGNLOCAL_TLS_CERT: cert, SIGNLOCAL_HOST: "127.0.0.1", SIGNLOCAL_PORT: String(port), SIGNLOCAL_CA_DOWNLOAD: "0", SIGNLOCAL_ALLOWED_ORIGIN: testOrigin, SIGNLOCAL_PAD_STATE_FILE: padState }, stdio: ["ignore", "pipe", "pipe"] });
  companion.stdout.on("data", (chunk) => { companionLog += chunk.toString(); }); companion.stderr.on("data", (chunk) => { companionLog += chunk.toString(); });
  await waitFor(async () => { try { await callApi("/api/sessions"); return true; } catch { return false; } }, "Companion-Neustart");
  const restoredPad = JSON.parse(readFileSync(padState, "utf8")).pads.find((entry) => entry.id === pad.id);
  if (!restoredPad?.token) throw new Error("Die lokale Pad-Kennung konnte nach dem Companion-Neustart nicht wiederhergestellt werden.");
  let restoredPadReady = false; let restoredRequest; let restoredReceived;
  officePad = new WebSocket(`wss://127.0.0.1:${port}/signal?role=pad&pad=${encodeURIComponent(restoredPad.id)}&padToken=${encodeURIComponent(restoredPad.token)}`, { rejectUnauthorized: false, headers: { Origin: testOrigin } });
  officePad.on("message", (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "pad-ready") restoredPadReady = Boolean(message.trusted); if (message.type === "sign-request") restoredRequest = message; });
  await open(officePad); await waitFor(() => restoredPadReady, "Wiederverbindung des bestätigten Mitarbeiter-Pads");
  const restoredStatus = await readPadStatus();
  if (!restoredStatus.ready || !restoredStatus.trusted) throw new Error("Der Computer kann das dauerhaft vorbereitete Mitarbeiter-Pad nach dem Neustart nicht erkennen.");
  const restoredSession = await callApi("/api/sessions");
  if (!restoredSession.padReady || !restoredSession.padTrusted) throw new Error("Das vorbereitete Mitarbeiter-Pad war nach dem Companion-Neustart nicht direkt einsatzbereit.");
  const restoredDesktop = new WebSocket(sessionEndpoint(restoredSession, "desktop"), { rejectUnauthorized: false, headers: { Origin: testOrigin } });
  restoredDesktop.on("message", (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "signature") restoredReceived = message; });
  await open(restoredDesktop); await waitFor(() => restoredRequest?.session === restoredSession.id && restoredRequest?.padTrusted, "direkte Anfrage nach Companion-Neustart");
  officePad.send(JSON.stringify({ type: "signature", points: [[[0.52, 0.44]]], color: "#155e63" }));
  await waitFor(() => Boolean(restoredReceived), "Signatur nach Companion-Neustart");
  if (JSON.stringify(restoredReceived.points) !== JSON.stringify([[[0.52, 0.44]]])) throw new Error("Die Signatur nach Companion-Neustart wurde nicht unverändert weitergereicht.");
  officePad.send(JSON.stringify({ type: "forget-pad" }));
  await waitFor(async () => { const status = await readPadStatus(); return !status.ready && !status.trusted; }, "bewusste Trennung des Büro-Pads");
  if (JSON.parse(readFileSync(padState, "utf8")).pads?.length) throw new Error("Die lokale Bindungsdatei enthält nach der bewussten Pad-Trennung noch ein Büro-Pad.");
  const rePairedPad = await callApi("/api/pads");
  let rePairedReady = false; let rePairedRequest;
  officePad = new WebSocket(`wss://127.0.0.1:${port}/signal?role=pad&pad=${encodeURIComponent(rePairedPad.id)}&padToken=${encodeURIComponent(rePairedPad.token)}`, { rejectUnauthorized: false, headers: { Origin: testOrigin } });
  officePad.on("message", (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "pad-ready") rePairedReady = !message.trusted; if (message.type === "sign-request") rePairedRequest = message; });
  await open(officePad); await waitFor(() => rePairedReady, "neue vorbereitete Pad-Bindung nach Trennung");
  const rePairedSession = await callApi("/api/sessions");
  if (!rePairedSession.padReady || rePairedSession.padTrusted) throw new Error("Ein nach bewusster Trennung neu vorbereitetes Pad darf nicht ohne Codevergleich vertraut sein.");
  await waitFor(() => rePairedRequest?.session === rePairedSession.id && !rePairedRequest?.padTrusted, "Codepflicht nach neuer Pad-Kopplung");
  officePad.terminate(); companion.kill();
  await new Promise((resolve) => setTimeout(resolve, 160));
  const expiredState = JSON.parse(readFileSync(padState, "utf8"));
  expiredState.pads = expiredState.pads.map((entry) => ({ ...entry, expiresAt: Date.now() - 1, trusted: true }));
  writeFileSync(padState, JSON.stringify(expiredState), { mode: 0o600 });
  companion = spawn(process.execPath, ["server.mjs"], { cwd: root, env: { ...process.env, SIGNLOCAL_TLS_KEY: key, SIGNLOCAL_TLS_CERT: cert, SIGNLOCAL_HOST: "127.0.0.1", SIGNLOCAL_PORT: String(port), SIGNLOCAL_CA_DOWNLOAD: "0", SIGNLOCAL_ALLOWED_ORIGIN: testOrigin, SIGNLOCAL_PAD_STATE_FILE: padState }, stdio: ["ignore", "pipe", "pipe"] });
  companion.stdout.on("data", (chunk) => { companionLog += chunk.toString(); }); companion.stderr.on("data", (chunk) => { companionLog += chunk.toString(); });
  await waitFor(async () => { try { await callApi("/api/sessions"); return true; } catch { return false; } }, "Companion-Neustart mit abgelaufener Pad-Bindung");
  const expiredStatus = await readPadStatus();
  if (expiredStatus.ready || expiredStatus.trusted) throw new Error("Ein abgelaufenes Büro-Pad wurde nach dem Neustart weiterhin als bereit oder vertrauenswürdig behandelt.");
  if (JSON.parse(readFileSync(padState, "utf8")).pads?.length) throw new Error("Die abgelaufene lokale Büro-Pad-Bindung wurde nicht aus der Zustandsdatei entfernt.");
  console.log("test-signature-strokes.mjs: Test erfolgreich");
} finally { stop(); }
