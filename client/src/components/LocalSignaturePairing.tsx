/**
 * Design: „Ruhiger Wegweiser“ — ein vorbereitetes Büro-Pad wird nach der
 * bewussten Vertrauensbindung auf eine ruhige Bereitschaftszeile reduziert.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Link2, Loader2, RefreshCw, ShieldCheck, Smartphone, Wifi } from "lucide-react";
import { SIGNATURE_DATE_FORMATS, type SignatureDateFormat } from "@/lib/signatureCaption";

type PairingSession = { id: string; token: string; verificationCode: string; qrCode: string; expiresAt: number; padReady?: boolean; padTrusted?: boolean };
type OfficePad = { id: string; token: string; padQrCode: string; expiresAt: number };
type Confirmation = { desktop: boolean; mobile: boolean };
type RemotePoint = [number, number];
type RemoteStroke = RemotePoint[];
export type RemoteSignatureDetails = { signerName?: string; signedAt?: string; signedPlace?: string; showDate?: boolean; dateFormat?: SignatureDateFormat };
type CaptionDetails = { signerName: string; signedPlace: string; showDate: boolean; dateFormat: SignatureDateFormat };
export type LocalSignaturePairingHandle = { requestOfficeSignature: () => void };
const COMPANION_ORIGIN_KEY = "signlocal-companion-origin";
const SIGNATURE_RASTER_SCALE = 4;

function drawSmoothStroke(context: CanvasRenderingContext2D, points: readonly (readonly [number, number])[]) {
  const [first, ...following] = points;
  if (!first) return;
  context.beginPath();
  context.moveTo(first[0], first[1]);
  if (following.length === 1) {
    context.lineTo(following[0][0], following[0][1]);
  } else {
    for (let index = 0; index < following.length - 1; index += 1) {
      const current = following[index];
      const next = following[index + 1];
      context.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
    }
    const last = following[following.length - 1];
    context.quadraticCurveTo(last[0], last[1], last[0], last[1]);
  }
  context.stroke();
}

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
  const strokes = rawStrokes.map((stroke) => stroke.filter(isRemotePoint)).filter((stroke) => stroke.length > 0);
  if (!strokes.length) throw new Error("Die empfangene Unterschrift enthält keine Zeichenpunkte.");
  return strokes;
}

export function toSignatureImage(points: unknown, color: unknown, details: RemoteSignatureDetails) {
  const strokes = normalizeStrokes(points);
  const displayWidth = 740;
  const displayHeight = details.signerName || details.signedAt || details.signedPlace ? 320 : 260;
  const rasterScale = SIGNATURE_RASTER_SCALE;
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
      context.beginPath();
      context.arc(mapped[0][0], mapped[0][1], Math.max(3.6, context.lineWidth / 2), 0, Math.PI * 2);
      context.fill();
      return;
    }
    drawSmoothStroke(context, mapped);
  });
  const date = details.showDate !== false && details.signedAt && !Number.isNaN(Date.parse(details.signedAt)) ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(details.signedAt)) : "";
  const label = [details.signerName?.trim(), details.signedPlace?.trim(), date].filter(Boolean).join(" · ");
  if (label) {
    context.fillStyle = "#506967";
    context.font = "600 18px system-ui, sans-serif";
    context.fillText(label.slice(0, 110), 42, displayHeight - 24);
  }
  return canvas.toDataURL("image/png");
}

export const LocalSignaturePairing = forwardRef<LocalSignaturePairingHandle, { onSignature: (image: string, details: RemoteSignatureDetails) => void; onOfficePadReady?: (ready: boolean) => void }>(function LocalSignaturePairing({ onSignature, onOfficePadReady }, ref) {
  const initialCompanionOriginRef = useRef<string | null>(localStorage.getItem(COMPANION_ORIGIN_KEY));
  const [originInput, setOriginInput] = useState(() => initialCompanionOriginRef.current ?? "");
  const [origin, setOrigin] = useState(() => initialCompanionOriginRef.current ?? "");
  const [session, setSession] = useState<PairingSession | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>({ desktop: false, mobile: false });
  const [connectionError, setConnectionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "waiting" | "connected" | "ready" | "received">("idle");
  const [officePad, setOfficePad] = useState<OfficePad | null>(null);
  const [officePadAvailable, setOfficePadAvailable] = useState(false);
  const [officePadTrusted, setOfficePadTrusted] = useState(false);
  const [showTrustedPadPanel, setShowTrustedPadPanel] = useState(false);
  const [usingOfficePad, setUsingOfficePad] = useState(false);
  const [receivedPreview, setReceivedPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState<CaptionDetails>({ signerName: "", signedPlace: "", showDate: true, dateFormat: "de" });
  const socketRef = useRef<WebSocket | null>(null);
  const intentionalCloseRef = useRef(false);

  const closeSocket = useCallback(() => {
    intentionalCloseRef.current = true;
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  const resetAfterMobileAction = useCallback((officeReady: boolean, trusted = false) => {
    closeSocket();
    setSession(null);
    setConfirmation({ desktop: false, mobile: false });
    setUsingOfficePad(false);
    setOfficePadAvailable(officeReady);
    setOfficePadTrusted(trusted);
    if (officeReady) setOfficePad(null);
    onOfficePadReady?.(officeReady);
    setPhase("idle");
  }, [closeSocket, onOfficePadReady]);

  const connect = useCallback((nextSession: PairingSession, nextOrigin: string) => {
    closeSocket();
    intentionalCloseRef.current = false;
    const socket = new WebSocket(`${nextOrigin.replace(/^https:/, "wss:")}/signal?role=desktop&session=${encodeURIComponent(nextSession.id)}&token=${encodeURIComponent(nextSession.token)}`);
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
          const details: RemoteSignatureDetails = { signerName: typeof message.signerName === "string" ? message.signerName : "", signedAt: typeof message.signedAt === "string" ? message.signedAt : "", signedPlace: typeof message.signedPlace === "string" ? message.signedPlace : "", showDate: Boolean(message.showDate), dateFormat: ["de", "iso", "long"].includes(message.dateFormat) ? message.dateFormat : "de" };
          const image = toSignatureImage(message.points, message.color, details);
          setReceivedPreview(image);
          onSignature(image, details);
          setPhase("received");
        }
        if (message.type === "mobile-finished") resetAfterMobileAction(Boolean(message.officePadReady), Boolean(message.padTrusted));
        if (message.type === "mobile-cancelled") { setReceivedPreview(null); resetAfterMobileAction(Boolean(message.officePadReady), Boolean(message.padTrusted)); }
        if (message.type === "expired") { resetAfterMobileAction(false); setConnectionError("Die Anfrage ist nach fünf Minuten abgelaufen. Prüfe das iPad oder iPhone und versuche es erneut."); }
        if (message.type === "disconnected") {
          setConfirmation((current) => message.role === "mobile" ? { ...current, mobile: false } : { ...current, desktop: false });
          setOfficePadTrusted(false);
          setPhase("connected");
          setConnectionError("Die Verbindung zum Mobilgerät wurde unterbrochen. Prüfe privates WLAN, Zertifikat und die geöffnete Pad-Seite; danach erneut versuchen.");
        }
        if (message.type === "error") setConnectionError(message.message || "Die lokale Verbindung konnte nicht fortgesetzt werden.");
      } catch { setConnectionError("Ungültige Daten aus der lokalen Begleit-App empfangen."); }
    };
    socket.onerror = () => setConnectionError("Die sichere lokale Verbindung konnte nicht hergestellt werden. Prüfe WLAN, Zertifikat und lokale Adresse.");
    socket.onclose = () => { if (!intentionalCloseRef.current && Date.now() < nextSession.expiresAt) setConnectionError("Die Verbindung wurde beendet. Prüfe das geöffnete Pad und versuche es erneut."); };
  }, [closeSocket, onSignature, resetAfterMobileAction]);

  useEffect(() => () => closeSocket(), [closeSocket]);
  useEffect(() => {
    const savedOrigin = initialCompanionOriginRef.current;
    if (!savedOrigin) return;
    let active = true;
    fetch(`${savedOrigin}/api/pad-status`)
      .then((response) => response.ok ? response.json() : null)
      .then((status) => {
        if (!active || !status?.ready) return;
        setOfficePadAvailable(true);
        setOfficePadTrusted(Boolean(status.trusted));
        onOfficePadReady?.(true);
      })
      .catch(() => { if (active) onOfficePadReady?.(false); });
    return () => { active = false; };
  }, [onOfficePadReady]);
  useEffect(() => {
    if (!session) return;
    const timeout = window.setTimeout(() => {
      if (Date.now() >= session.expiresAt) {
        resetAfterMobileAction(false);
        setConnectionError("Die Anfrage ist nach fünf Minuten abgelaufen. Es wurde keine Signatur übernommen.");
      }
    }, Math.max(0, session.expiresAt - Date.now() + 100));
    return () => window.clearTimeout(timeout);
  }, [session, resetAfterMobileAction]);

  const prepareOfficePad = async () => {
    setBusy(true); setConnectionError("");
    try {
      const nextOrigin = normalizeOrigin(originInput);
      const response = await fetch(`${nextOrigin}/api/pads`, { method: "POST" });
      if (!response.ok) throw new Error("Das lokale Büro-Signaturpad konnte nicht vorbereitet werden.");
      const nextPad = await response.json() as OfficePad;
      if (!nextPad.id || !nextPad.token || !nextPad.padQrCode) throw new Error("Die Begleit-App hat unvollständige Büro-Pad-Daten geliefert.");
      localStorage.setItem(COMPANION_ORIGIN_KEY, nextOrigin); setOrigin(nextOrigin); setOfficePad(nextPad); setOfficePadAvailable(true); setOfficePadTrusted(false); setShowTrustedPadPanel(true); onOfficePadReady?.(true);
    } catch (error) { setConnectionError(error instanceof Error ? error.message : "Das lokale Büro-Signaturpad konnte nicht vorbereitet werden."); }
    finally { setBusy(false); }
  };

  const startSession = useCallback(async () => {
    setBusy(true); setConnectionError(""); setConfirmation({ desktop: false, mobile: false }); setPhase("idle"); setReceivedPreview(null);
    try {
      const nextOrigin = normalizeOrigin(originInput || origin);
      const response = await fetch(`${nextOrigin}/api/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signatureDetails: { ...caption, signerName: caption.signerName.trim().slice(0, 80), signedPlace: caption.signedPlace.trim().slice(0, 80), signedAt: caption.showDate ? new Date().toISOString() : null } }) });
      if (!response.ok) throw new Error("Die lokale Begleit-App hat keine Sitzung erstellt.");
      const nextSession = await response.json() as PairingSession;
      if (!nextSession.id || !nextSession.token || !nextSession.qrCode) throw new Error("Die Begleit-App hat unvollständige Sitzungsdaten geliefert.");
      localStorage.setItem(COMPANION_ORIGIN_KEY, nextOrigin); setOrigin(nextOrigin); setSession(nextSession); setUsingOfficePad(Boolean(nextSession.padReady)); setOfficePadAvailable(Boolean(nextSession.padReady)); setOfficePadTrusted(Boolean(nextSession.padTrusted)); onOfficePadReady?.(Boolean(nextSession.padReady)); setPhase("waiting"); connect(nextSession, nextOrigin);
    } catch (error) { setConnectionError(error instanceof Error ? error.message : "Die lokale Signatursitzung konnte nicht gestartet werden."); }
    finally { setBusy(false); }
  }, [caption, connect, onOfficePadReady, origin, originInput]);

  useImperativeHandle(ref, () => ({ requestOfficeSignature: () => {
    if (!officePadAvailable) { setConnectionError("Das Büro-Signaturpad ist nicht bereit. Bereite die Pad-Seite einmalig vor oder prüfe, ob sie auf dem Mobilgerät noch geöffnet ist."); return; }
    void startSession();
  } }), [officePadAvailable, startSession]);

  const retry = () => {
    if (!session || Date.now() >= session.expiresAt || !origin) { void startSession(); return; }
    setConnectionError(""); setConfirmation({ desktop: false, mobile: false }); setPhase("waiting"); connect(session, origin);
  };
  const confirmCode = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) { setConnectionError("Die lokale Verbindung ist nicht aktiv. Versuche es erneut."); return; }
    socketRef.current.send(JSON.stringify({ type: "confirm-code", verificationCode: session?.verificationCode }));
    setConfirmation((current) => ({ ...current, desktop: true }));
  };
  const requestNext = () => {
    if (!officePadAvailable) { setConnectionError("Das Büro-Signaturpad ist nicht mehr bereit. Öffne die Pad-Seite erneut und bereite sie einmalig vor."); return; }
    void startSession();
  };
  const isTrustedPadReady = officePadAvailable && officePadTrusted && !session;

  return <section className="paper-card overflow-hidden rounded-[1.5rem] bg-[#fffdf8] p-5">
    {isTrustedPadReady && !showTrustedPadPanel ? <div className="flex items-center justify-between gap-3" role="status">
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#eaf4ef] text-[#155e63]"><CheckCircle2 size={21}/></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">Büro-Pad bereit</p><p className="mt-1 text-sm font-semibold text-[#183234]">Vertrautes Mobilgerät ist verbunden.</p></div></div>
      <button type="button" onClick={() => setShowTrustedPadPanel(true)} className="min-h-10 shrink-0 rounded-xl border border-[#155e63]/25 bg-white px-3 text-xs font-bold text-[#155e63] active:scale-[.97]">Angaben ändern</button>
    </div> : <>
      <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#155e63] text-white shadow-md shadow-[#155e63]/20"><Wifi size={20}/></div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">Lokales Signaturpad</p><h2 className="mt-1 font-bold text-[#183234]">Mobilgerät sicher koppeln</h2><p className="mt-1 text-sm leading-5 text-[#506967]">Angaben werden hier am Computer festgelegt. Das Mobilgerät zeigt ausschließlich die Signaturfläche.</p></div></div>
      {!session && <div className="mt-4">
        <label className="text-xs font-bold uppercase tracking-[.12em] text-[#506967]" htmlFor="companion-origin">Lokale HTTPS-Adresse der Begleit-App</label>
        <input id="companion-origin" value={originInput} onChange={(event) => setOriginInput(event.target.value)} placeholder="https://192.168.1.20:8787" className="mt-2 min-h-11 w-full rounded-xl border border-[#d8d3c9] bg-white px-3 text-sm text-[#183234] outline-none focus:border-[#155e63]"/>
        <div className="mt-3 rounded-2xl border border-[#d8d3c9]/75 bg-white/70 p-3"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#506967]">Angaben für diese Signatur <span className="normal-case font-medium">(optional)</span></p>
          <label className="mt-3 block text-xs font-semibold text-[#506967]" htmlFor="remote-signer-name">Name<input id="remote-signer-name" value={caption.signerName} onChange={(event) => setCaption((current) => ({ ...current, signerName: event.target.value.slice(0, 80) }))} className="mt-1 min-h-11 w-full rounded-xl border border-[#d8d3c9] bg-white px-3 text-sm text-[#183234] outline-none focus:border-[#155e63]"/></label>
          <label className="mt-3 block text-xs font-semibold text-[#506967]" htmlFor="remote-signer-place">Ort<input id="remote-signer-place" value={caption.signedPlace} onChange={(event) => setCaption((current) => ({ ...current, signedPlace: event.target.value.slice(0, 80) }))} className="mt-1 min-h-11 w-full rounded-xl border border-[#d8d3c9] bg-white px-3 text-sm text-[#183234] outline-none focus:border-[#155e63]"/></label>
          <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs font-semibold text-[#506967]">Datum unter Unterschrift</span><button type="button" role="switch" aria-checked={caption.showDate} onClick={() => setCaption((current) => ({ ...current, showDate: !current.showDate }))} className={`relative h-8 w-14 rounded-full transition ${caption.showDate ? "bg-[#155e63]" : "bg-[#d8d3c9]"}`}><span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${caption.showDate ? "left-7" : "left-1"}`}/><span className="sr-only">Datum unter Unterschrift anzeigen</span></button></div>
          {caption.showDate && <label className="mt-3 block text-xs font-semibold text-[#506967]" htmlFor="remote-date-format">Datumsformat<select id="remote-date-format" value={caption.dateFormat} onChange={(event) => setCaption((current) => ({ ...current, dateFormat: event.target.value as SignatureDateFormat }))} className="mt-1 min-h-11 w-full rounded-xl border border-[#d8d3c9] bg-white px-3 text-sm text-[#183234] outline-none focus:border-[#155e63]">{SIGNATURE_DATE_FORMATS.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}</select></label>}
        </div>
        {!officePad && !officePadAvailable && <button onClick={prepareOfficePad} disabled={busy} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#155e63]/30 bg-[#eef2e9] px-4 text-sm font-bold text-[#183234] disabled:opacity-60 active:scale-[.97]">{busy ? <Loader2 size={17} className="animate-spin"/> : <Smartphone size={17}/>}Büro-Signaturpad vorbereiten</button>}
        {officePad && <div className="mt-4 grid grid-cols-[112px_1fr] gap-3 rounded-2xl border border-[#a7b9a6]/55 bg-[#eef2e9]/55 p-3"><img src={officePad.padQrCode} alt="QR-Code zum Einrichten des lokalen Büro-Signaturpads" className="w-28 rounded-xl bg-white p-1 shadow-sm"/><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#155e63]">Einmalig im Büro</p><p className="mt-1 text-sm font-bold text-[#183234]">Pad-Seite auf iPad oder iPhone öffnen</p><p className="mt-1 text-xs leading-5 text-[#506967]">Nach dem Scan bleibt diese Seite offen. Alle Angaben werden weiterhin nur hier am Computer festgelegt.</p></div></div>}
        {officePadAvailable && !officePad && <p className="mt-3 rounded-xl bg-[#eaf4ef] p-3 text-sm font-semibold text-[#183234]"><CheckCircle2 className="mr-2 inline text-[#155e63]" size={17}/>Büro-Signaturpad ist bereit. Neue Anforderungen gehen direkt an das gekoppelte Mobilgerät.</p>}
        <div className="mt-3 flex gap-2"><button onClick={() => void startSession()} disabled={busy} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#155e63] px-4 text-sm font-bold text-white shadow-md shadow-[#155e63]/15 disabled:opacity-60 active:scale-[.97]">{busy ? <Loader2 size={17} className="animate-spin"/> : <Link2 size={17}/>} {officePadAvailable ? "Unterschrift am Büro-Pad anfordern" : "Lokale Sitzung starten"}</button>{isTrustedPadReady && <button type="button" onClick={() => setShowTrustedPadPanel(false)} className="min-h-11 rounded-xl border border-[#155e63]/25 bg-white px-3 text-xs font-bold text-[#155e63] active:scale-[.97]">Ausblenden</button>}</div>
      </div>}
    </>}
    {session && <div className="mt-4">
      {usingOfficePad ? <div className="relative overflow-hidden rounded-2xl border border-[#155e63]/30 bg-[#eaf4ef] p-4" role="status" aria-live="polite"><div aria-hidden="true" className="absolute -right-5 -top-5 h-20 w-20 rounded-full border-[10px] border-[#155e63]/10"/><div className="relative flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#155e63] text-white shadow-md shadow-[#155e63]/20"><Smartphone size={24}/></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">{session.padTrusted ? "Büro-Pad bestätigt" : "QR-Code nicht nötig"}</p><h3 className="mt-1 text-lg font-extrabold text-[#183234]">Büro-Signaturpad wird angefordert</h3><p className="mt-1 text-sm leading-5 text-[#506967]">{session.padTrusted ? "Das weiterhin verbundene Gerät kann direkt unterschreiben. Kein erneuter Codevergleich für diese Pad-Bindung." : "Das bereits geöffnete iPad, iPhone oder Android-Gerät erhält die Zeichenaufforderung direkt."}</p></div></div>{!session.padTrusted && <div className="relative mt-4 rounded-xl border border-[#a7b9a6]/55 bg-white/80 px-3 py-2"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#155e63]">Vergleichscode</p><p className="mt-1 text-2xl font-extrabold tracking-[.14em] text-[#183234]">{session.verificationCode}</p></div>}{session.padTrusted && <div className="relative mt-4 rounded-xl border border-[#a7b9a6]/55 bg-white/80 px-3 py-2"><p className="text-sm font-bold text-[#183234]"><ShieldCheck className="mr-2 inline text-[#155e63]" size={17}/>Vertrauensbindung aktiv</p><p className="mt-1 text-xs leading-5 text-[#506967]">Bei Ablauf, einer getrennten Verbindung oder einem neuen Gerät wird der Vergleichscode wieder verlangt.</p></div>}</div> : <div className="grid grid-cols-[112px_1fr] gap-3 rounded-2xl border border-[#a7b9a6]/55 bg-[#eef2e9]/55 p-3"><img src={session.qrCode} alt="QR-Code für die lokale Signaturkopplung" className="w-28 rounded-xl bg-white p-1 shadow-sm"/><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#155e63]">Vergleichscode</p><p className="mt-1 text-2xl font-extrabold tracking-[.14em] text-[#183234]">{session.verificationCode}</p><p className="mt-2 text-xs leading-5 text-[#506967]">QR-Code scannen und anschließend den Code auf beiden Geräten vergleichen.</p></div></div>}
      {phase === "waiting" && <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#a7b9a6]/55 bg-[#eef2e9]/55 p-4" role="status" aria-live="polite"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#155e63]/20"><Loader2 size={21} className="animate-spin text-[#155e63]"/></span><div><p className="font-bold text-[#183234]">{usingOfficePad ? "Warte auf die Unterschrift am Büro-Pad" : "Warte auf die sichere Mobilverbindung"}</p><p className="mt-1 text-sm leading-5 text-[#506967]">{usingOfficePad ? session.padTrusted ? "Die Aufforderung ist lokal auf dem bestätigten Gerät sichtbar. Das PDF bleibt auf diesem Computer." : "Die Aufforderung ist lokal auf dem gekoppelten Gerät sichtbar. Vergleiche einmalig den Code." : "Scanne den QR-Code auf dem Mobilgerät und vergleiche anschließend den Code."}</p></div></div>}
      {phase === "connected" && <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#155e63]/30 bg-[#eaf4ef] p-4 shadow-sm" role="status" aria-live="polite"><div aria-hidden="true" className="absolute -right-5 -top-5 h-20 w-20 rounded-full border-[10px] border-[#155e63]/10"/><div className="relative flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#155e63] text-white shadow-md shadow-[#155e63]/20"><CheckCircle2 size={27} strokeWidth={2.5}/></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">Lokale Verbindung steht</p><h3 className="mt-1 text-lg font-extrabold text-[#183234]">{usingOfficePad ? "Büro-Signaturpad verbunden" : "iPad, iPhone oder Android verbunden"}</h3><p className="mt-1 text-sm leading-5 text-[#506967]">Vergleiche jetzt den sechsstelligen Code auf beiden Geräten.</p></div></div><button onClick={confirmCode} disabled={confirmation.desktop} className="relative mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#155e63] px-3 text-sm font-bold text-white shadow-md shadow-[#155e63]/15 disabled:opacity-60 active:scale-[.97]">{confirmation.desktop ? <><CheckCircle2 size={17}/>Code auf diesem Computer bestätigt</> : <><ShieldCheck size={17}/>Code stimmt überein</>}</button></div>}
      {phase === "ready" && <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#eaf4ef] p-3 text-sm font-bold text-[#183234]"><CheckCircle2 size={18} className="text-[#155e63]"/>{session.padTrusted ? "Die bestätigte Büro-Pad-Bindung ist aktiv. Das Mobilgerät kann direkt unterschreiben." : "Beide Geräte haben den Code bestätigt. Das Mobilgerät ist zum Unterschreiben freigegeben."}</p>}
    </div>}
    {receivedPreview && <section className="mt-4 rounded-2xl border border-[#155e63]/25 bg-[#eaf4ef] p-4" aria-label="Vorschau der übertragenen Unterschrift"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-[#155e63]" size={20}/><div className="min-w-0 flex-1"><p className="font-bold text-[#183234]">Unterschrift lokal übertragen</p><p className="mt-1 text-sm leading-5 text-[#506967]">Prüfe die Vorschau und setze sie im PDF an die gewünschte Position. Für eine weitere Person kannst du direkt erneut anfordern.</p><img src={receivedPreview} alt="Vorschau der übertragenen Unterschrift" className="mt-3 h-24 w-full rounded-xl border border-[#a7b9a6]/45 bg-white object-contain p-2"/><button onClick={requestNext} disabled={!officePadAvailable || busy} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#155e63]/30 bg-white px-3 text-sm font-bold text-[#155e63] disabled:opacity-60 active:scale-[.97]"><Smartphone size={17}/>Neue Unterschrift am Pad anfordern</button></div></div></section>}
    {connectionError && <div className="mt-4 rounded-2xl border border-[#b6383a]/25 bg-[#fff1ee] p-3" role="alert"><p className="flex gap-2 text-sm font-bold text-[#8f2a2d]"><AlertTriangle size={17} className="shrink-0"/>{connectionError}</p><button onClick={retry} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#8f2a2d] px-3 text-xs font-bold text-white active:scale-[.97]"><RefreshCw size={15}/>Erneut versuchen</button></div>}
    {session && <p className="mt-3 text-xs leading-5 text-[#6b7d7b]">Die Anfrage läuft nach fünf Minuten ab. Bei Abbruch wird keine Signatur automatisch übernommen.</p>}
  </section>;
});
