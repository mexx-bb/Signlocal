let session;
let socket;
const qr = document.querySelector("#qr");
const verification = document.querySelector("#verification");
const status = document.querySelector("#session-status");
const title = document.querySelector("#signature-title");
const help = document.querySelector("#signature-help");
const finish = document.querySelector("#finish");
const canvas = document.querySelector("#signature-preview");
const context = canvas.getContext("2d");
const pairingConfirmation = document.querySelector("#pairing-confirmation");
const pairingKicker = document.querySelector("#pairing-kicker");
const pairingTitle = document.querySelector("#pairing-title");
const pairingText = document.querySelector("#pairing-text");
const caSetup = document.querySelector("#ca-setup");
const caQr = document.querySelector("#ca-qr");
const caFingerprint = document.querySelector("#ca-fingerprint");
const caSetupLink = document.querySelector("#ca-setup-link");
let pairingTimer;

function websocketUrl(role) { return `${location.origin.replace("https", "wss")}/signal?role=${role}&session=${encodeURIComponent(session.id)}&token=${encodeURIComponent(session.token)}`; }
function draw(points, color) { const strokes = Array.isArray(points) && points.every((point) => Array.isArray(point) && point.length === 2) ? [points] : Array.isArray(points) ? points.filter(Array.isArray) : []; context.clearRect(0, 0, canvas.width, canvas.height); if (!strokes.length) return; context.strokeStyle = color; context.fillStyle = color; context.lineWidth = 5; context.lineCap = "round"; context.lineJoin = "round"; strokes.forEach((stroke) => { const mapped = stroke.map(([x, y]) => [x * canvas.width, y * canvas.height]); if (mapped.length === 1) { context.beginPath(); context.arc(mapped[0][0], mapped[0][1], Math.max(3.6, context.lineWidth / 2), 0, Math.PI * 2); context.fill(); return; } context.beginPath(); context.moveTo(mapped[0][0], mapped[0][1]); if (mapped.length === 2) { context.lineTo(mapped[1][0], mapped[1][1]); } else { for (let index = 1; index < mapped.length - 1; index += 1) { const current = mapped[index]; const next = mapped[index + 1]; context.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2); } const last = mapped[mapped.length - 1]; context.quadraticCurveTo(last[0], last[1], last[0], last[1]); } context.stroke(); }); }
function setPairingState(state, text) { pairingConfirmation.hidden = false; pairingConfirmation.dataset.state = state; pairingKicker.textContent = state === "ready" ? "Kopplung bereit" : state === "received" ? "Signatur lokal empfangen" : "Lokale Verbindung"; pairingTitle.textContent = state === "ready" ? "Mobilgerät sicher gekoppelt" : state === "received" ? "Signatur ist eingetroffen" : "Mobilgerät verbunden"; pairingText.textContent = text; }
function connectDesktop() { socket = new WebSocket(websocketUrl("desktop")); socket.onmessage = (event) => { const message = JSON.parse(event.data); if (message.type === "paired") { status.textContent = "Mobilgerät gekoppelt. Vergleiche jetzt den Code auf beiden Geräten."; verification.textContent = message.verificationCode; setPairingState("checking", "Lokale Verbindung wird geprüft …"); clearTimeout(pairingTimer); pairingTimer = setTimeout(() => setPairingState("ready", "Vergleiche den sechsstelligen Code auf beiden Geräten. Danach kann das Mobilgerät unterschreiben."), 1350); } if (message.type === "signature") { clearTimeout(pairingTimer); draw(message.points, message.color); title.textContent = "Signatur lokal empfangen"; help.textContent = "Prüfe die Vorschau und übernimm sie später in das geöffnete PDF. Die Sitzung kann danach sicher beendet werden."; setPairingState("received", "Die Signaturpunkte wurden nur in dieser lokalen Sitzung an den Computer übergeben."); finish.disabled = false; } }; }
async function loadCaSetup() { const response = await fetch("/api/ca-setup"); const setup = await response.json(); if (!setup.enabled) return; caSetup.hidden = false; caQr.src = setup.qrCode; caFingerprint.textContent = `SHA-256: ${setup.fingerprint}`; caSetupLink.href = setup.setupUrl; }
async function createSession() { finish.disabled = true; clearTimeout(pairingTimer); pairingConfirmation.hidden = true; context.clearRect(0, 0, canvas.width, canvas.height); title.textContent = "Warte auf die Kopplung"; help.textContent = "Vergleiche nach dem Scan den Code auf Computer und Mobilgerät, bevor du unterschreibst."; status.textContent = "Lokale Sitzung wird erzeugt …"; socket?.close(); const response = await fetch("/api/sessions", { method: "POST" }); session = await response.json(); qr.src = session.qrCode; verification.textContent = session.verificationCode; status.textContent = "QR-Code mit iPad, iPhone oder Android scannen. Die Sitzung läuft nach fünf Minuten ab."; connectDesktop(); }
document.querySelector("#new-session").addEventListener("click", createSession);
finish.addEventListener("click", () => { socket?.send(JSON.stringify({ type: "finish" })); status.textContent = "Sitzung beendet. Die Signatur lag nur im Arbeitsspeicher der lokalen Sitzung."; finish.disabled = true; });
loadCaSetup().catch(() => { /* Die strikt deaktivierte oder nicht verfügbare Einrichtungsseite blockiert die Signaturkopplung nicht. */ });
createSession().catch(() => { status.textContent = "Lokale Sitzung konnte nicht gestartet werden. Prüfe das lokale TLS-Zertifikat und die private WLAN-Verbindung."; });
