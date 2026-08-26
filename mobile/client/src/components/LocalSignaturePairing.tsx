// Design: Ruhige, vertrauensstarke lokale Kopplung mit klarer Freigabe und sichtbaren Fehlerpfaden.
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Link2, Loader2, RefreshCw, ShieldCheck, Smartphone, Wifi } from "lucide-react";

type PairingSession = { id: string; token: string; verificationCode: string; qrCode: string; expiresAt: number };
type Confirmation = { desktop: boolean; mobile: boolean };
type RemotePoint = [number, number];
type RemoteStroke = RemotePoint[];
type RemoteSignatureDetails = { signerName?: string; signedAt?: string };

function normalizeOrigin(value: string) {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) throw new Error("Gib die lokale HTTPS-Adresse der Signlocal-Begleit-App ein.");
  return trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
}

function isRemotePoint(point: unknown): point is RemotePoint {
  return Array.isArray(point) && point.length === 2 && point.every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1);
}

function normalizeStrokes(points: unknown): RemoteStroke[] {
  if (!Array.isArray(points)) throw new Error("Die empfangene Unterschrift ist unvollständig.");
  const rawStrokes = points.every(isRemotePoint) ? [points] : points.filter(Array.isArray);
  const normalized = rawStrokes.map((stroke) => stroke.filter(isRemotePoint)).filter((stroke) => stroke.length > 0);
  if (!normalized.length) throw new Error("Die empfangene Unterschrift enthält keine Zeichenpunkte.");
  return normalized;
}

export function toSignatureImage(points: unknown, color: unknown, details: RemoteSignatureDetails) {
  const strokes = normalizeStrokes(points);
  const displayWidth = 740;
  const displayHeight = details.signerName || details.signedAt ? 320 : 260;
  const rasterScale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = displayWidth * rasterScale;
  canvas.height = displayHeight * rasterScale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Die empfangene Unterschrift konnte nicht vorbereitet werden.");
  const signatureColor = color === "#a4483d" ? color : "#155e63";
  context.setTransform(rasterScale, 0, 0, rasterScale, 0, 0);
  context.clearRect(0, 0, displayWidth, displayHeight);
  context.strokeStyle = signatureColor;
  context.fillStyle = signatureColor;
  context.lineWidth = 5.4;
  context.lineCap = "round";
  context.lineJoin = "round";
  strokes.forEach((stroke) => {
    const mapped = stroke.map(([x, y]) => [42 + x * (displayWidth - 84), 32 + y * (displayHeight - 64)] as const);
    if (mapped.length === 1) {
      context.beginPath(); context.arc(mapped[0][0], mapped[0][1], Math.max(3.6, context.lineWidth / 2), 0, Math.PI * 2); context.fill();
      return;
    }
    context.beginPath();
    mapped.forEach(([pointX, pointY], index) => { if (index) context.lineTo(pointX, pointY); else context.moveTo(pointX, pointY); });
    context.stroke();
  });
  const timestamp = details.signedAt && !Number.isNaN(Date.parse(details.signedAt)) ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(details.signedAt)) : "";
  const label = [details.signerName?.trim(), timestamp].filter(Boolean).join(" · ");
  if (label) {
    context.fillStyle = "#506967";
    context.font = "600 18px system-ui, sans-serif";
    context.fillText(label.slice(0, 110), 42, displayHeight - 24);
  }
  return canvas.toDataURL("image/png");
}

export function LocalSignaturePairing({ onSignature }: { onSignature: (image: string, details: RemoteSignatureDetails) => void }) {
  const [originInput, setOriginInput] = useState("");
  const [origin, setOrigin] = useState("");
  const [session, setSession] = useState<PairingSession | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>({ desktop: false, mobile: false });
  const [connectionError, setConnectionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "waiting" | "connected" | "ready" | "received">("idle");
  const socketRef = useRef<WebSocket | null>(null);
  const intentionalCloseRef = useRef(false);

  const closeSocket = useCallback(() => {
    intentionalCloseRef.current = true;
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  const connect = useCallback((nextSession: PairingSession, nextOrigin: string) => {
    closeSocket();
    intentionalCloseRef.current = false;
    const socketOrigin = nextOrigin.replace(/^https:/, "wss:");
    const socket = new WebSocket(`${socketOrigin}/signal?role=desktop&session=${encodeURIComponent(nextSession.id)}&token=${encodeURIComponent(nextSession.token)}`);
    socketRef.current = socket;
    socket.onopen = () => { setConnectionError(""); setPhase((current) => current === "idle" ? "waiting" : current); };
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "paired") setPhase("connected");
        if (message.type === "confirmation") {
          const nextConfirmation = { desktop: Boolean(message.desktopConfirmed), mobile: Boolean(message.mobileConfirmed) };
          setConfirmation(nextConfirmation);
          if (nextConfirmation.desktop && nextConfirmation.mobile) setPhase("ready");
        }
        if (message.type === "ready") { setPhase("ready"); setConfirmation({ desktop: true, mobile: true }); }
        if (message.type === "signature") {
          const details = { signerName: typeof message.signerName === "string" ? message.signerName : "", signedAt: typeof message.signedAt === "string" ? message.signedAt : "" };
          onSignature(toSignatureImage(message.points, message.color, details), details);
          setPhase("received");
        }
        if (message.type === "disconnected") {
          setConfirmation((current) => message.role === "mobile" ? { ...current, mobile: false } : { ...current, desktop: false });
          setPhase("connected");
          setConnectionError("Die Verbindung zum Mobilgerät wurde unterbrochen. Prüfe WLAN und Nähe zum Computer, dann verbinde erneut.");
        }
        if (message.type === "error") setConnectionError(message.message || "Die lokale Verbindung konnte nicht fortgesetzt werden.");
      } catch { setConnectionError("Ungültige Daten aus der lokalen Begleit-App empfangen."); }
    };
    socket.onerror = () => setConnectionError("Die sichere lokale Verbindung konnte nicht hergestellt werden. Prüfe WLAN, Zertifikat und lokale Adresse.");
    socket.onclose = () => { if (!intentionalCloseRef.current && Date.now() < nextSession.expiresAt) setConnectionError("Die lokale Verbindung wurde beendet. Du kannst die Sitzung erneut verbinden."); };
  }, [closeSocket, onSignature]);

  useEffect(() => () => closeSocket(), [closeSocket]);

  const startSession = async () => {
    setBusy(true); setConnectionError(""); setConfirmation({ desktop: false, mobile: false }); setPhase("idle");
    try {
      const nextOrigin = normalizeOrigin(originInput);
      const response = await fetch(`${nextOrigin}/api/sessions`, { method: "POST" });
      if (!response.ok) throw new Error("Die lokale Begleit-App hat keine Sitzung erstellt.");
      const nextSession = await response.json() as PairingSession;
      if (!nextSession.id || !nextSession.token || !nextSession.qrCode) throw new Error("Die lokale Begleit-App hat unvollständige Sitzungsdaten geliefert.");
      setOrigin(nextOrigin); setSession(nextSession); setPhase("waiting"); connect(nextSession, nextOrigin);
    } catch (error) { setConnectionError(error instanceof Error ? error.message : "Die lokale Signatursitzung konnte nicht gestartet werden."); }
    finally { setBusy(false); }
  };

  const retry = () => {
    if (!session || !origin) return void startSession();
    setConnectionError(""); setConfirmation({ desktop: false, mobile: false }); setPhase("waiting"); connect(session, origin);
  };
  const confirmCode = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return setConnectionError("Die lokale Verbindung ist nicht aktiv. Versuche es erneut.");
    socketRef.current.send(JSON.stringify({ type: "confirm-code", verificationCode: session?.verificationCode }));
    setConfirmation((current) => ({ ...current, desktop: true }));
  };

  const bothConfirmed = confirmation.desktop && confirmation.mobile;
  return <section className="paper-card overflow-hidden rounded-[1.5rem] bg-[#fffdf8] p-5">
    <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#155e63] text-white shadow-md shadow-[#155e63]/20"><Wifi size={20}/></div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">Lokales Signaturpad</p><h2 className="mt-1 font-bold text-[#183234]">Mobilgerät sicher koppeln</h2><p className="mt-1 text-sm leading-5 text-[#506967]">iPad, iPhone oder Android unterschreibt im gleichen privaten WLAN. Das PDF bleibt auf diesem Computer.</p></div></div>
    {!session && <div className="mt-4"><label className="text-xs font-bold uppercase tracking-[.12em] text-[#506967]" htmlFor="companion-origin">Lokale HTTPS-Adresse der Begleit-App</label><input id="companion-origin" value={originInput} onChange={(event) => setOriginInput(event.target.value)} placeholder="https://192.168.1.20:8787" className="mt-2 min-h-11 w-full rounded-xl border border-[#d8d3c9] bg-white px-3 text-sm text-[#183234] outline-none focus:border-[#155e63]"/><button onClick={startSession} disabled={busy} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#155e63] px-4 text-sm font-bold text-white shadow-md shadow-[#155e63]/15 disabled:opacity-60 active:scale-[.97]">{busy ? <Loader2 size={17} className="animate-spin"/> : <Link2 size={17}/>}Lokale Sitzung starten</button></div>}
    {session && <div className="mt-4"><div className="grid grid-cols-[112px_1fr] gap-3 rounded-2xl border border-[#a7b9a6]/55 bg-[#eef2e9]/55 p-3"><img src={session.qrCode} alt="QR-Code für die lokale Signaturkopplung" className="w-28 rounded-xl bg-white p-1 shadow-sm"/><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#155e63]">Vergleichscode</p><p className="mt-1 text-2xl font-extrabold tracking-[.14em] text-[#183234]">{session.verificationCode}</p><p className="mt-2 text-xs leading-5 text-[#506967]">QR-Code scannen und anschließend den Code auf beiden Geräten vergleichen.</p></div></div>
      {phase === "waiting" && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#506967]"><Loader2 size={16} className="animate-spin text-[#155e63]"/>Warte auf den QR-Scan …</p>}
      {phase === "connected" && <div className="mt-3 rounded-xl border border-[#155e63]/20 bg-white p-3"><p className="flex items-center gap-2 text-sm font-bold text-[#183234]"><Smartphone size={16} className="text-[#155e63]"/>Mobilgerät verbunden</p><p className="mt-1 text-xs leading-5 text-[#506967]">Stimmt der sechsstellige Code auf beiden Geräten überein? Bestätige ihn erst dann.</p><button onClick={confirmCode} disabled={confirmation.desktop} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#155e63] px-3 text-xs font-bold text-white disabled:opacity-60">{confirmation.desktop ? <><CheckCircle2 size={15}/>Code auf diesem Computer bestätigt</> : <><ShieldCheck size={15}/>Code stimmt überein</>}</button></div>}
      {phase === "ready" && <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#eaf4ef] p-3 text-sm font-bold text-[#183234]"><CheckCircle2 size={18} className="text-[#155e63]"/>Beide Geräte haben den Code bestätigt. Das Mobilgerät ist zum Unterschreiben freigegeben.</p>}
      {phase === "received" && <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#eaf4ef] p-3 text-sm font-bold text-[#183234]"><CheckCircle2 size={18} className="text-[#155e63]"/>Signatur empfangen – tippe jetzt im PDF auf die gewünschte Position.</p>}
    </div>}
    {connectionError && <div className="mt-4 rounded-2xl border border-[#b6383a]/25 bg-[#fff1ee] p-3" role="alert"><p className="flex gap-2 text-sm font-bold text-[#8f2a2d]"><AlertTriangle size={17} className="shrink-0"/>{connectionError}</p><button onClick={retry} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#8f2a2d] px-3 text-xs font-bold text-white active:scale-[.97]"><RefreshCw size={15}/>Erneut verbinden</button></div>}
    {session && <p className="mt-3 text-xs leading-5 text-[#6b7d7b]">Die Sitzung läuft nach fünf Minuten ab. Bei einem Verbindungsabbruch wird keine Signatur automatisch übernommen.</p>}
  </section>;
}
