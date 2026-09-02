const parameters = new URLSearchParams(location.search);
const suppliedSession = parameters.get("session");
const suppliedToken = parameters.get("token");
const suppliedPad = parameters.get("pad");
const suppliedPadToken = parameters.get("padToken");
const PAD_ID_KEY = "signlocal-office-pad";
const PAD_TOKEN_KEY = "signlocal-office-pad-token";

if (suppliedSession && suppliedToken) {
  sessionStorage.setItem("signlocal-mobile-session", suppliedSession);
  sessionStorage.setItem("signlocal-mobile-token", suppliedToken);
  history.replaceState(null, "", location.pathname);
}
if (suppliedPad && suppliedPadToken) {
  localStorage.setItem(PAD_ID_KEY, suppliedPad);
  localStorage.setItem(PAD_TOKEN_KEY, suppliedPadToken);
  history.replaceState(null, "", location.pathname);
}

let session = suppliedPad ? null : suppliedSession ?? sessionStorage.getItem("signlocal-mobile-session");
let token = suppliedPad ? null : suppliedToken ?? sessionStorage.getItem("signlocal-mobile-token");
let pad = suppliedPad ?? localStorage.getItem(PAD_ID_KEY);
let padToken = suppliedPadToken ?? localStorage.getItem(PAD_TOKEN_KEY);
let isOfficePad = Boolean(pad && padToken);
const code = document.querySelector("#verification");
const connection = document.querySelector("#connection");
const delivery = document.querySelector("#delivery");
const confirmCode = document.querySelector("#confirm-code");
const confirmation = document.querySelector("#confirmation");
const verificationCard = document.querySelector("#verification-card");
const canvas = document.querySelector("#signature-pad");
const context = canvas.getContext("2d");
const clearButton = document.querySelector("#clear");
const cancelButton = document.querySelector("#cancel");
const sendButton = document.querySelector("#send");
const forgetPadButton = document.querySelector("#forget-pad");
const officePadReady = document.querySelector("#office-pad-ready");
const officePadStatus = document.querySelector("#office-pad-status");
const signingContent = document.querySelector("#signing-content");
const strokes = [];
let drawing = false;
let activeStroke = null;
let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let manualDisconnect = false;
let signatureAllowed = false;
let delivered = false;
const MIN_SIGNATURE_RASTER_SCALE = 3;

function resize() { const bounds = canvas.getBoundingClientRect(); const scale = Math.max(window.devicePixelRatio || 1, MIN_SIGNATURE_RASTER_SCALE); canvas.width = Math.max(1, Math.round(bounds.width * scale)); canvas.height = Math.max(1, Math.round(bounds.height * scale)); context.setTransform(scale, 0, 0, scale, 0, 0); context.imageSmoothingEnabled = true; context.strokeStyle = "#155e63"; context.lineWidth = 3; context.lineCap = "round"; context.lineJoin = "round"; redraw(); }
function drawSmoothStroke(stroke, bounds) { const points = stroke.map(([x, y]) => [x * bounds.width, y * bounds.height]); if (points.length === 1) { context.beginPath(); context.arc(points[0][0], points[0][1], Math.max(2.2, context.lineWidth / 2), 0, Math.PI * 2); context.fill(); return; } context.beginPath(); context.moveTo(points[0][0], points[0][1]); if (points.length === 2) { context.lineTo(points[1][0], points[1][1]); } else { for (let index = 1; index < points.length - 1; index += 1) { const current = points[index]; const next = points[index + 1]; context.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2); } const last = points[points.length - 1]; context.quadraticCurveTo(last[0], last[1], last[0], last[1]); } context.stroke(); }
function redraw() { const bounds = canvas.getBoundingClientRect(); context.clearRect(0, 0, bounds.width, bounds.height); if (!strokes.length) return; context.fillStyle = "#155e63"; strokes.forEach((stroke) => drawSmoothStroke(stroke, bounds)); }
function updateSendState() { sendButton.disabled = !signatureAllowed || delivered || !strokes.some((stroke) => stroke.length); clearButton.disabled = delivered; cancelButton.disabled = delivered; }
function locationPoint(event) { const bounds = canvas.getBoundingClientRect(); return [Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))]; }
function resetSignature() { strokes.length = 0; activeStroke = null; delivered = false; delivery.textContent = ""; redraw(); updateSendState(); }
function sendPayload(payload) { if (!socket || socket.readyState !== WebSocket.OPEN) { delivery.textContent = "Die lokale Verbindung ist nicht aktiv. Prüfe den Computer und starte die Sitzung erneut."; return false; } socket.send(JSON.stringify(payload)); return true; }
function showOfficeReady(message = "Diese Seite bleibt offen. Sobald auf dem Computer eine lokale Sitzung gestartet wird, erscheint hier die Aufforderung zum Unterschreiben.") { document.body.classList.remove("signing-active"); officePadReady.hidden = false; signingContent.hidden = true; officePadStatus.textContent = message; connection.textContent = "Büro-Signaturpad ist lokal bereit."; }
function showSignRequest(message) { session = message.session; token = message.token; code.textContent = message.verificationCode; signatureAllowed = Boolean(message.padTrusted); resetSignature(); document.body.classList.add("signing-active"); officePadReady.hidden = true; signingContent.hidden = false; verificationCard.hidden = Boolean(message.padTrusted); connection.textContent = message.padTrusted ? "Dieses Büro-Signaturpad ist weiterhin lokal verbunden und bereits bestätigt. Du kannst direkt unterschreiben." : "Neue Unterschrift angefordert. Vergleiche diesen Code mit dem Computer und bestätige ihn auf beiden Geräten."; confirmation.textContent = message.padTrusted ? "Dauerhafte Pad-Bindung aktiv. Erst nach Ablauf, Trennung oder Gerätewechsel wird der Code wieder abgefragt." : ""; confirmCode.disabled = Boolean(message.padTrusted); updateSendState(); requestAnimationFrame(resize); }
function clearOfficePad() { localStorage.removeItem(PAD_ID_KEY); localStorage.removeItem(PAD_TOKEN_KEY); pad = null; padToken = null; isOfficePad = false; }
function schedulePadReconnect() { if (!isOfficePad || manualDisconnect || reconnectTimer) return; const delay = Math.min(30_000, 1_000 * 2 ** Math.min(reconnectAttempts, 5)); reconnectAttempts += 1; reconnectTimer = window.setTimeout(() => { reconnectTimer = null; connectOfficePad(); }, delay); }
function connectOfficePad() {
  if (!isOfficePad || manualDisconnect || !pad || !padToken || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
  const nextSocket = new WebSocket(`${location.origin.replace(/^https:/, "wss:")}/signal?role=pad&pad=${encodeURIComponent(pad)}&padToken=${encodeURIComponent(padToken)}`);
  socket = nextSocket;
  attachSocket(nextSocket);
}
function connectOneTimeSession() {
  if (!session || !token) { connection.textContent = "Diese lokale Kopplung ist ungültig oder abgelaufen."; return; }
  const nextSocket = new WebSocket(`${location.origin.replace(/^https:/, "wss:")}/signal?role=mobile&session=${encodeURIComponent(session)}&token=${encodeURIComponent(token)}`);
  socket = nextSocket;
  attachSocket(nextSocket);
}
function attachSocket(nextSocket) {
  nextSocket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "pad-ready") { reconnectAttempts = 0; verificationCard.hidden = false; showOfficeReady(message.trusted ? "Dieses Gerät bleibt als vorbereitetes Signaturpad verbunden. Neue Aufforderungen erscheinen hier direkt." : undefined); }
    if (message.type === "sign-request") showSignRequest(message);
    if (message.type === "hello") { verificationCard.hidden = false; code.textContent = message.verificationCode; connection.textContent = "Vergleiche diesen Code mit dem Computer. Stimmen beide überein, bestätige ihn auf beiden Geräten."; confirmCode.disabled = false; }
    if (message.type === "confirmation") { signatureAllowed = Boolean(message.desktopConfirmed && message.mobileConfirmed); confirmation.textContent = signatureAllowed ? "Beide Geräte haben den Code bestätigt. Du kannst jetzt unterschreiben." : message.mobileConfirmed ? "Code auf diesem Gerät bestätigt. Warte auf den Computer." : "Warte auf die Code-Bestätigung auf diesem Gerät."; updateSendState(); }
    if (message.type === "ready") { signatureAllowed = true; confirmation.textContent = "Beide Geräte haben den Code bestätigt. Du kannst jetzt unterschreiben."; updateSendState(); }
    if (message.type === "delivered") { delivered = true; delivery.textContent = "Signatur lokal bestätigt. Das Gerät bleibt für die nächste Anfrage bereit."; updateSendState(); }
    if (message.type === "become-pad") { isOfficePad = true; session = null; token = null; sessionStorage.removeItem("signlocal-mobile-session"); sessionStorage.removeItem("signlocal-mobile-token"); pad = message.pad; padToken = message.padToken; localStorage.setItem(PAD_ID_KEY, pad); localStorage.setItem(PAD_TOKEN_KEY, padToken); showOfficeReady(message.cancelled ? "Anforderung abgebrochen. Dieses Gerät bleibt als Büro-Signaturpad bereit." : "Unterschrift bestätigt. Dieses Gerät bleibt als Büro-Signaturpad für die nächste lokale Sitzung bereit."); }
    if (message.type === "cancelled") { signatureAllowed = false; showOfficeReady("Anforderung abgebrochen. Das Büro-Signaturpad ist wieder bereit."); }
    if (message.type === "finished") { signatureAllowed = false; if (isOfficePad) showOfficeReady("Unterschrift abgeschlossen. Das Büro-Signaturpad ist für die nächste lokale Sitzung bereit."); else { delivery.textContent = "Sitzung sicher beendet."; sessionStorage.removeItem("signlocal-mobile-session"); sessionStorage.removeItem("signlocal-mobile-token"); updateSendState(); } }
    if (message.type === "expired") { signatureAllowed = false; if (isOfficePad) showOfficeReady("Die vorherige Sitzung ist abgelaufen. Das Büro-Signaturpad ist wieder bereit."); else connection.textContent = "Die lokale Sitzung ist abgelaufen. Starte am Computer eine neue Sitzung."; updateSendState(); }
    if (message.type === "disconnected") { signatureAllowed = false; connection.textContent = "Die Gegenstelle wurde getrennt. Kehre zum Computer zurück und starte eine neue lokale Sitzung."; updateSendState(); }
    if (message.type === "error") delivery.textContent = message.message;
  };
  nextSocket.onerror = () => { if (isOfficePad) showOfficeReady("Die sichere lokale Verbindung zum Computer wird wiederhergestellt. Prüfe nur bei dauerhafter Störung WLAN, Zertifikat und die lokale Pad-Seite."); else connection.textContent = "Die sichere lokale Verbindung konnte nicht hergestellt werden. Prüfe Zertifikat, WLAN und den QR-Code."; };
  nextSocket.onclose = () => {
    if (socket !== nextSocket) return;
    socket = null;
    if (isOfficePad && !manualDisconnect) { signatureAllowed = false; updateSendState(); showOfficeReady("Lokale Verbindung kurz unterbrochen. Dieses Gerät verbindet sich automatisch erneut, solange die Seite geöffnet bleibt."); schedulePadReconnect(); }
  };
}

canvas.addEventListener("pointerdown", (event) => { if (!signatureAllowed || delivered) return; drawing = true; canvas.setPointerCapture(event.pointerId); activeStroke = [locationPoint(event)]; strokes.push(activeStroke); redraw(); updateSendState(); });
canvas.addEventListener("pointermove", (event) => { if (!drawing || !activeStroke) return; activeStroke.push(locationPoint(event)); redraw(); updateSendState(); });
canvas.addEventListener("pointerup", () => { drawing = false; activeStroke = null; });
canvas.addEventListener("pointercancel", () => { drawing = false; activeStroke = null; });
clearButton.addEventListener("click", () => { resetSignature(); delivery.textContent = "Zeichnung verworfen. Du kannst neu unterschreiben oder abbrechen."; });
cancelButton.addEventListener("click", () => { if (sendPayload({ type: "cancel" })) { cancelButton.disabled = true; delivery.textContent = "Anforderung wird abgebrochen …"; } });
sendButton.addEventListener("click", () => { if (sendPayload({ type: "signature", points: strokes, color: "#155e63" })) delivery.textContent = "Signatur wird lokal bestätigt und an den Computer übertragen …"; });
confirmCode.addEventListener("click", () => { if (sendPayload({ type: "confirm-code", verificationCode: code.textContent })) { confirmCode.disabled = true; confirmation.textContent = "Code auf diesem Mobilgerät bestätigt. Warte auf die Bestätigung am Computer."; } });
forgetPadButton.addEventListener("click", () => { manualDisconnect = true; window.clearTimeout(reconnectTimer); reconnectTimer = null; if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "forget-pad" })); clearOfficePad(); socket?.close(1000, "Büro-Signaturpad bewusst getrennt"); location.replace(location.pathname); });
window.addEventListener("resize", () => { if (!signingContent.hidden) resize(); });
window.addEventListener("online", () => { if (isOfficePad) connectOfficePad(); });

if (isOfficePad) { showOfficeReady(); connectOfficePad(); }
else connectOneTimeSession();
