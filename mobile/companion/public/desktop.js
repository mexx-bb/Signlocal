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
let pairingTimer;

function websocketUrl(role) { return `${location.origin.replace("https", "wss")}/signal?role=${role}&session=${encodeURIComponent(session.id)}&token=${encodeURIComponent(session.token)}`; }
function draw(points, color) { context.clearRect(0, 0, canvas.width, canvas.height); if (!points.length) return; context.strokeStyle = color; context.lineWidth = 5; context.lineCap = "round"; context.lineJoin = "round"; context.beginPath(); points.forEach(([x, y], index) => { const px = x * canvas.width; const py = y * canvas.height; index ? context.lineTo(px, py) : context.moveTo(px, py); }); context.stroke(); }
function setPairingState(state, text) { pairingConfirmation.hidden = false; pairingConfirmation.dataset.state = state; pairingKicker.textContent = state === "ready" ? "Kopplung bereit" : state === "received" ? "Signatur lokal empfangen" : "Lokale Verbindung"; pairingTitle.textContent = state === "ready" ? "Mobilgerät sicher gekoppelt" : state === "received" ? "Signatur ist eingetroffen" : "Mobilgerät verbunden"; pairingText.textContent = text; }
function connectDesktop() { socket = new WebSocket(websocketUrl("desktop")); socket.onmessage = (event) => { const message = JSON.parse(event.data); if (message.type === "paired") { status.textContent = "Mobilgerät gekoppelt. Vergleiche jetzt den Code auf beiden Geräten."; verification.textContent = message.verificationCode; setPairingState("checking", "Lokale Verbindung wird geprüft …"); clearTimeout(pairingTimer); pairingTimer = setTimeout(() => setPairingState("ready", "Vergleiche den sechsstelligen Code auf beiden Geräten. Danach kann das Mobilgerät unterschreiben."), 1350); } if (message.type === "signature") { clearTimeout(pairingTimer); draw(message.points, message.color); title.textContent = "Signatur lokal empfangen"; help.textContent = "Prüfe die Vorschau und übernimm sie später in das geöffnete PDF. Die Sitzung kann danach sicher beendet werden."; setPairingState("received", "Die Signaturpunkte wurden nur in dieser lokalen Sitzung an den Computer übergeben."); finish.disabled = false; } }; }
async function createSession() { finish.disabled = true; clearTimeout(pairingTimer); pairingConfirmation.hidden = true; context.clearRect(0, 0, canvas.width, canvas.height); title.textContent = "Warte auf die Kopplung"; help.textContent = "Vergleiche nach dem Scan den Code auf Computer und Mobilgerät, bevor du unterschreibst."; status.textContent = "Lokale Sitzung wird erzeugt …"; socket?.close(); const response = await fetch("/api/sessions", { method: "POST" }); session = await response.json(); qr.src = session.qrCode; verification.textContent = session.verificationCode; status.textContent = "QR-Code mit iPad, iPhone oder Android scannen. Die Sitzung läuft nach fünf Minuten ab."; connectDesktop(); }
document.querySelector("#new-session").addEventListener("click", createSession);
finish.addEventListener("click", () => { socket?.send(JSON.stringify({ type: "finish" })); status.textContent = "Sitzung beendet. Die Signatur lag nur im Arbeitsspeicher der lokalen Sitzung."; finish.disabled = true; });
createSession().catch(() => { status.textContent = "Lokale Sitzung konnte nicht gestartet werden. Prüfe das lokale TLS-Zertifikat und die private WLAN-Verbindung."; });
