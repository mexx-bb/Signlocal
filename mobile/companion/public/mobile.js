const parameters = new URLSearchParams(location.search);
const session = parameters.get("session");
const token = parameters.get("token");
const code = document.querySelector("#verification");
const connection = document.querySelector("#connection");
const delivery = document.querySelector("#delivery");
const confirmCode = document.querySelector("#confirm-code");
const confirmation = document.querySelector("#confirmation");
const signerName = document.querySelector("#signer-name");
const includeTimestamp = document.querySelector("#include-timestamp");
const canvas = document.querySelector("#signature-pad");
const context = canvas.getContext("2d");
const points = [];
let drawing = false;
let socket;
let signatureAllowed = false;

function resize() { const bounds = canvas.getBoundingClientRect(); const scale = window.devicePixelRatio || 1; canvas.width = Math.round(bounds.width * scale); canvas.height = Math.round(bounds.height * scale); context.scale(scale, scale); context.strokeStyle = "#155e63"; context.lineWidth = 3; context.lineCap = "round"; context.lineJoin = "round"; redraw(); }
function redraw() { const bounds = canvas.getBoundingClientRect(); context.clearRect(0, 0, bounds.width, bounds.height); if (!points.length) return; context.beginPath(); points.forEach(([x, y], index) => index ? context.lineTo(x * bounds.width, y * bounds.height) : context.moveTo(x * bounds.width, y * bounds.height)); context.stroke(); }
function updateSendState() { document.querySelector("#send").disabled = !signatureAllowed || points.length < 2; }
function locationPoint(event) { const bounds = canvas.getBoundingClientRect(); return [Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))]; }
canvas.addEventListener("pointerdown", (event) => { drawing = true; canvas.setPointerCapture(event.pointerId); points.push(locationPoint(event)); redraw(); updateSendState(); });
canvas.addEventListener("pointermove", (event) => { if (!drawing) return; points.push(locationPoint(event)); redraw(); updateSendState(); });
canvas.addEventListener("pointerup", () => { drawing = false; });
document.querySelector("#clear").addEventListener("click", () => { points.length = 0; redraw(); updateSendState(); delivery.textContent = ""; });
document.querySelector("#send").addEventListener("click", () => { socket?.send(JSON.stringify({ type: "signature", points, color: "#155e63", signerName: signerName.value.trim().slice(0, 80), signedAt: includeTimestamp.checked ? new Date().toISOString() : null })); delivery.textContent = "Signatur wird ausschließlich an den gekoppelten Computer übertragen …"; });
confirmCode.addEventListener("click", () => { socket?.send(JSON.stringify({ type: "confirm-code", verificationCode: code.textContent })); confirmCode.disabled = true; confirmation.textContent = "Code auf diesem Mobilgerät bestätigt. Warte auf die Bestätigung am Computer."; });
window.addEventListener("resize", resize);
resize();
if (!session || !token) { connection.textContent = "Diese lokale Kopplung ist ungültig oder abgelaufen."; } else { socket = new WebSocket(`${location.origin.replace("https", "wss")}/signal?role=mobile&session=${encodeURIComponent(session)}&token=${encodeURIComponent(token)}`); socket.onmessage = (event) => { const message = JSON.parse(event.data); if (message.type === "hello") { code.textContent = message.verificationCode; connection.textContent = "Vergleiche diesen Code mit dem Computer. Stimmen beide überein, bestätige ihn auf beiden Geräten."; confirmCode.disabled = false; } if (message.type === "confirmation") { signatureAllowed = Boolean(message.desktopConfirmed && message.mobileConfirmed); confirmation.textContent = signatureAllowed ? "Beide Geräte haben den Code bestätigt. Die Unterschrift ist freigegeben." : message.mobileConfirmed ? "Code auf diesem Gerät bestätigt. Warte auf den Computer." : "Warte auf die Code-Bestätigung auf diesem Gerät."; updateSendState(); } if (message.type === "ready") { signatureAllowed = true; confirmation.textContent = "Beide Geräte haben den Code bestätigt. Die Unterschrift ist freigegeben."; updateSendState(); } if (message.type === "delivered") delivery.textContent = "Signatur lokal empfangen. Du kannst dieses Gerät jetzt liegen lassen."; if (message.type === "finished") { delivery.textContent = "Sitzung sicher beendet."; signatureAllowed = false; updateSendState(); } if (message.type === "disconnected") { connection.textContent = "Die Gegenstelle wurde getrennt. Kehre zum Computer zurück und starte eine neue lokale Sitzung."; signatureAllowed = false; updateSendState(); } if (message.type === "error") delivery.textContent = message.message; }; socket.onerror = () => { connection.textContent = "Die sichere lokale Verbindung konnte nicht hergestellt werden. Prüfe Zertifikat, WLAN und den QR-Code."; }; }
