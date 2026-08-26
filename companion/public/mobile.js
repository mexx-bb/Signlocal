const parameters = new URLSearchParams(location.search);
const suppliedSession = parameters.get("session");
const suppliedToken = parameters.get("token");
if (suppliedSession && suppliedToken) {
  sessionStorage.setItem("signlocal-mobile-session", suppliedSession);
  sessionStorage.setItem("signlocal-mobile-token", suppliedToken);
  history.replaceState(null, "", location.pathname);
}
const session = suppliedSession ?? sessionStorage.getItem("signlocal-mobile-session");
const token = suppliedToken ?? sessionStorage.getItem("signlocal-mobile-token");
const code = document.querySelector("#verification");
const connection = document.querySelector("#connection");
const delivery = document.querySelector("#delivery");
const confirmCode = document.querySelector("#confirm-code");
const confirmation = document.querySelector("#confirmation");
const signerName = document.querySelector("#signer-name");
const includeTimestamp = document.querySelector("#include-timestamp");
const canvas = document.querySelector("#signature-pad");
const context = canvas.getContext("2d");
const strokes = [];
let drawing = false;
let activeStroke = null;
let socket;
let signatureAllowed = false;

function resize() { const bounds = canvas.getBoundingClientRect(); const scale = window.devicePixelRatio || 1; canvas.width = Math.round(bounds.width * scale); canvas.height = Math.round(bounds.height * scale); context.scale(scale, scale); context.strokeStyle = "#155e63"; context.lineWidth = 3; context.lineCap = "round"; context.lineJoin = "round"; redraw(); }
function redraw() { const bounds = canvas.getBoundingClientRect(); context.clearRect(0, 0, bounds.width, bounds.height); if (!strokes.length) return; context.fillStyle = "#155e63"; strokes.forEach((stroke) => { if (stroke.length === 1) { context.beginPath(); context.arc(stroke[0][0] * bounds.width, stroke[0][1] * bounds.height, Math.max(2.2, context.lineWidth / 2), 0, Math.PI * 2); context.fill(); return; } context.beginPath(); stroke.forEach(([x, y], index) => index ? context.lineTo(x * bounds.width, y * bounds.height) : context.moveTo(x * bounds.width, y * bounds.height)); context.stroke(); }); }
function updateSendState() { document.querySelector("#send").disabled = !signatureAllowed || !strokes.some((stroke) => stroke.length); }
function locationPoint(event) { const bounds = canvas.getBoundingClientRect(); return [Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))]; }
canvas.addEventListener("pointerdown", (event) => { drawing = true; canvas.setPointerCapture(event.pointerId); activeStroke = [locationPoint(event)]; strokes.push(activeStroke); redraw(); updateSendState(); });
canvas.addEventListener("pointermove", (event) => { if (!drawing || !activeStroke) return; activeStroke.push(locationPoint(event)); redraw(); updateSendState(); });
canvas.addEventListener("pointerup", () => { drawing = false; activeStroke = null; });
canvas.addEventListener("pointercancel", () => { drawing = false; activeStroke = null; });
document.querySelector("#clear").addEventListener("click", () => { strokes.length = 0; activeStroke = null; redraw(); updateSendState(); delivery.textContent = ""; });
document.querySelector("#send").addEventListener("click", () => { socket?.send(JSON.stringify({ type: "signature", points: strokes, color: "#155e63", signerName: signerName.value.trim().slice(0, 80), signedAt: includeTimestamp.checked ? new Date().toISOString() : null })); delivery.textContent = "Signatur wird ausschließlich an den gekoppelten Computer übertragen …"; });
confirmCode.addEventListener("click", () => { socket?.send(JSON.stringify({ type: "confirm-code", verificationCode: code.textContent })); confirmCode.disabled = true; confirmation.textContent = "Code auf diesem Mobilgerät bestätigt. Warte auf die Bestätigung am Computer."; });
window.addEventListener("resize", resize);
resize();
if (!session || !token) { connection.textContent = "Diese lokale Kopplung ist ungültig oder abgelaufen."; } else { socket = new WebSocket(`${location.origin.replace("https", "wss")}/signal?role=mobile&session=${encodeURIComponent(session)}&token=${encodeURIComponent(token)}`); socket.onmessage = (event) => { const message = JSON.parse(event.data); if (message.type === "hello") { code.textContent = message.verificationCode; connection.textContent = "Vergleiche diesen Code mit dem Computer. Stimmen beide überein, bestätige ihn auf beiden Geräten."; confirmCode.disabled = false; } if (message.type === "confirmation") { signatureAllowed = Boolean(message.desktopConfirmed && message.mobileConfirmed); confirmation.textContent = signatureAllowed ? "Beide Geräte haben den Code bestätigt. Die Unterschrift ist freigegeben." : message.mobileConfirmed ? "Code auf diesem Gerät bestätigt. Warte auf den Computer." : "Warte auf die Code-Bestätigung auf diesem Gerät."; updateSendState(); } if (message.type === "ready") { signatureAllowed = true; confirmation.textContent = "Beide Geräte haben den Code bestätigt. Die Unterschrift ist freigegeben."; updateSendState(); } if (message.type === "delivered") delivery.textContent = "Signatur lokal empfangen. Du kannst dieses Gerät jetzt liegen lassen."; if (message.type === "finished") { delivery.textContent = "Sitzung sicher beendet."; sessionStorage.removeItem("signlocal-mobile-session"); sessionStorage.removeItem("signlocal-mobile-token"); signatureAllowed = false; updateSendState(); } if (message.type === "disconnected") { connection.textContent = "Die Gegenstelle wurde getrennt. Kehre zum Computer zurück und starte eine neue lokale Sitzung."; signatureAllowed = false; updateSendState(); } if (message.type === "error") delivery.textContent = message.message; }; socket.onerror = () => { connection.textContent = "Die sichere lokale Verbindung konnte nicht hergestellt werden. Prüfe Zertifikat, WLAN und den QR-Code."; }; }
