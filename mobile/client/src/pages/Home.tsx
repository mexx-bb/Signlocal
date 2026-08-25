/**
 * Design: „Ruhiger Wegweiser“ — die Seite führt iPhone-Nutzende in einer
 * vertikalen Abfolge von Dokument über Signatur bis Export, mit großen Touch-Zielen.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { PDFDocument } from "pdf-lib";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Document, Page, pdfjs } from "react-pdf";
import { toast } from "sonner";
import { changeLocalVaultPassword, createLocalVault, deleteEncryptedDocument, enableFaceIdGate, exportEncryptedVaultBackup, getVaultSettings, hasVaultSettings, importEncryptedVaultBackup, isPlatformAuthenticatorAvailable, listEncryptedDocuments, requestLocalPersistence, saveEncryptedDocument, type LocalSignedDocument, type VaultRotationProgress, unlockLocalVault, verifyFaceIdGate } from "@/lib/localArchive";
import {
  Archive, ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Download, FilePlus2,
  FileText, Info, Loader2, LockKeyhole, PenLine, Plus, RotateCcw, RotateCw, ShieldCheck,
  Maximize2, Move, Sparkles, Trash2, Upload, X,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { LocalArchive } from "@/components/LocalArchive";
import { LocalSignaturePairing } from "@/components/LocalSignaturePairing";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const HERO_IMAGE = "/manus-storage/signlocal-hero_90dd687c.png";
const ILLUSTRATION_IMAGE = "/manus-storage/signlocal-mobile-illustration_0ec34c95.png";
const DETAIL_IMAGE = "/manus-storage/signlocal-path-detail_5b48504e.png";
const MARK_IMAGE = "/manus-storage/signlocal-mark_d05edad7.png";

type Signature = { id: string; image: string; x: number; y: number; page: number; width: number; source?: "local" | "mobile"; signerName?: string; signedAt?: string };
type LogEntry = { time: string; message: string };
const INK_COLORS = [
  { id: "blue", label: "Blau", hex: "#1f5aa6" },
  { id: "black", label: "Schwarz", hex: "#1f2428" },
  { id: "red", label: "Rot", hex: "#b6383a" },
] as const;

function now() {
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function SignatureDialog({ onClose, onSave }: { onClose: () => void; onSave: (image: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [inkColor, setInkColor] = useState<(typeof INK_COLORS)[number]>(INK_COLORS[0]);

  const position = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const point = position(event);
    drawing.current = true;
    lastPoint.current = point;
    ctx.lineWidth = 2.8; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = inkColor.hex;
    ctx.beginPath(); ctx.moveTo(point.x, point.y);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const point = position(event);
    const previous = lastPoint.current ?? point;
    const midpoint = { x: (previous.x + point.x) / 2, y: (previous.y + point.y) / 2 };
    const pressure = event.pressure && event.pressure > 0 ? event.pressure : 0.5;
    ctx.lineWidth = 2.1 + Math.min(0.7, Math.max(0.25, pressure)) * 1.35;
    ctx.quadraticCurveTo(previous.x, previous.y, midpoint.x, midpoint.y); ctx.stroke();
    lastPoint.current = point; setHasInk(true);
  };
  const end = () => { drawing.current = false; lastPoint.current = null; };
  const clear = () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    lastPoint.current = null;
    setHasInk(false);
  };
  const save = () => {
    if (!hasInk || !canvasRef.current) return toast.error("Bitte unterschreibe zuerst im Feld.");
    onSave(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div className="signature-dialog fixed inset-0 z-50 flex items-end bg-[#183234]/35 p-3 backdrop-blur-md sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Unterschrift erstellen">
      <section className="signature-panel w-full max-w-md rounded-[1.9rem] border border-white/75 bg-[#fffdf8] p-5 shadow-2xl shadow-[#183234]/25 sm:p-7">
        <div className="signature-heading mb-5 flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#6b7d7b]">Schritt 1 von 2</p><h2 className="display mt-1 text-3xl text-[#183234]">Unterschrift setzen</h2></div>
          <button onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d8d3c9]/70 bg-white/75 text-[#155e63] shadow-sm transition active:scale-95" aria-label="Schließen"><X size={20}/></button>
        </div>
        <p className="signature-help mb-4 text-sm leading-6 text-[#506967]">Zeichne mit dem Finger in Kugelschreiber-{inkColor.label}. Kleine Zitterbewegungen werden lokal und behutsam geglättet.</p>
        <div className="mb-4 rounded-2xl border border-[#d8d3c9]/75 bg-white/70 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.13em] text-[#506967]">Kugelschreiberfarbe</span><span className="text-sm font-bold" style={{ color: inkColor.hex }}>{inkColor.label}</span></div><div className="grid grid-cols-3 gap-2">{INK_COLORS.map((option) => <button key={option.id} onClick={() => { if (hasInk) clear(); setInkColor(option); }} aria-pressed={inkColor.id === option.id} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-bold transition active:scale-[.97] ${inkColor.id === option.id ? "border-[#155e63] bg-[#f7f3e9] shadow-sm" : "border-transparent bg-white text-[#506967]"}`}><span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: option.hex }}/>{option.label}{inkColor.id === option.id && <Check size={14} className="text-[#155e63]"/>}</button>)}</div></div>
        <div className="signature-canvas-wrap overflow-hidden rounded-[1.45rem] border border-[#a7b9a6]/55 bg-gradient-to-br from-[#eef2e9] via-[#f7f3e9] to-[#f0e6da] p-2 shadow-inner shadow-[#a7b9a6]/20">
          <canvas ref={canvasRef} width="740" height="260" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} className="signature-canvas h-40 w-full touch-none cursor-crosshair rounded-[1.05rem] bg-[#fffefb]" style={{ touchAction: "none", boxShadow: `inset 0 0 0 2px ${inkColor.hex}14` }} />
        </div>
        <div className="signature-actions mt-5 flex items-center justify-between gap-3">
          <button onClick={clear} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#155e63] transition active:scale-95"><RotateCcw size={17}/> Neu zeichnen</button>
          <button onClick={save} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#155e63] px-5 text-sm font-bold text-white shadow-lg shadow-[#155e63]/20 transition hover:bg-[#0d4549] active:scale-[.97]"><Check size={17}/> Position wählen</button>
        </div>
      </section>
    </div>
  );
}

function PageOverview({ pages, currentPage, pending, hasTemplate, signaturePreview, onSelect, onReuse, onStop }: { pages: { number: number; count: number }[]; currentPage: number; pending: boolean; hasTemplate: boolean; signaturePreview: string | null; onSelect: (page: number) => void; onReuse: () => void; onStop: () => void }) {
  if (!pages.length) return null;
  return (
    <section className="paper-card mb-4 rounded-2xl bg-[#fffdf8] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">Mehrfach unterschreiben</p><h2 className="mt-1 font-bold text-[#183234]">Seite wählen und wiederholen</h2></div>
        <span className="rounded-full bg-[#a7b9a6]/25 px-3 py-1.5 text-xs font-bold text-[#375552]">{pages.reduce((sum, entry) => sum + entry.count, 0)} gesetzt</span>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="PDF-Seiten">
        {pages.map((entry) => {
          const selected = entry.number === currentPage;
          const countText = entry.count ? entry.count + (entry.count === 1 ? " Unterschrift" : " Unterschriften") : "frei";
          return (
            <button key={entry.number} onClick={() => onSelect(entry.number)} role="tab" aria-selected={selected} className={selected ? "min-w-14 rounded-xl border border-[#155e63] bg-[#155e63] px-3 py-2 text-left text-white shadow-md transition active:scale-95" : "min-w-14 rounded-xl border border-[#d8d3c9] bg-white px-3 py-2 text-left text-[#506967] transition active:scale-95"}>
              <span className="block text-xs font-bold">Seite {entry.number}</span>
              <span className={selected ? "mt-1 block text-[11px] text-white/80" : "mt-1 block text-[11px] text-[#6b7d7b]"}>{countText}</span>
            </button>
          );
        })}
      </div>
      {signaturePreview && <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#a7b9a6]/55 bg-[#eef2e9]/60 p-3"><div className="grid h-14 min-w-28 place-items-center rounded-xl bg-white px-2 shadow-sm"><img src={signaturePreview} alt="Vorschau der zuletzt gezeichneten Unterschrift" className="max-h-10 max-w-24 object-contain"/></div><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.13em] text-[#155e63]">Letzte Unterschrift</p><p className="mt-1 text-sm leading-5 text-[#506967]">Direkt auf Seite {currentPage} wiederverwenden.</p></div><button onClick={onReuse} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#155e63] px-3 text-xs font-bold text-white shadow-md transition active:scale-[.97]">Verwenden</button></div>}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm leading-5 text-[#506967]">{pending ? `Unterschrift ist bereit – tippe auf Seite ${currentPage} beliebig oft an die gewünschten Stellen.` : "Wähle eine Seite und setze dort eine neue oder die letzte Unterschrift."}</p><div className="flex shrink-0 gap-2"><button onClick={onReuse} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#155e63] px-4 text-sm font-bold text-white shadow-md shadow-[#155e63]/15 transition hover:bg-[#0d4549] active:scale-[.97]"><PenLine size={16}/>{hasTemplate ? "Erneut platzieren" : "Unterschrift zeichnen"}</button>{pending && <button onClick={onStop} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8d3c9] bg-white px-3 text-sm font-bold text-[#155e63] transition active:scale-[.97]">Fertig</button>}</div></div>
    </section>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const documentSurfaceRef = useRef<HTMLDivElement>(null);
  const signatureGestureRef = useRef<{ id: string; mode: "move" | "resize"; startX: number; startY: number; startLeft: number; startTop: number; startWidth: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(720);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [removedSignatures, setRemovedSignatures] = useState<Signature[]>([]);
  const [archivedDocuments, setArchivedDocuments] = useState<LocalSignedDocument[]>([]);
  const [archiveReady, setArchiveReady] = useState(false);
  const [localPersistence, setLocalPersistence] = useState<boolean | null>(null);
  const [vaultConfigured, setVaultConfigured] = useState(false);
  const [vaultLocked, setVaultLocked] = useState(true);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [faceIdAvailable, setFaceIdAvailable] = useState(false);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [signatureTemplate, setSignatureTemplate] = useState<string | null>(null);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [pendingMobileSignature, setPendingMobileSignature] = useState(false);
  const [pendingMobileDetails, setPendingMobileDetails] = useState<{ signerName?: string; signedAt?: string }>({});
  const [mobileSignatureReviewId, setMobileSignatureReviewId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [exporting, setExporting] = useState(false);

  const pageSignatures = useMemo(() => signatures.filter((signature) => signature.page === page), [signatures, page]);
  const pageStatus = useMemo(() => Array.from({ length: pageCount }, (_, index) => ({ number: index + 1, count: signatures.filter((signature) => signature.page === index + 1).length })), [pageCount, signatures]);
  const addLog = (message: string) => setLogs((previous) => [{ time: now(), message }, ...previous].slice(0, 5));
  const refreshArchive = async (key = vaultKey) => {
    if (!key) return;
    try { setArchivedDocuments(await listEncryptedDocuments(key)); }
    catch { toast.error("Der verschlüsselte Dokumenttresor konnte nicht gelesen werden."); }
    finally { setArchiveReady(true); }
  };
  const archiveSignedDocument = async (pdf: Blob, name: string) => {
    if (!vaultKey || vaultLocked) { toast.error("Entsperre zuerst den lokalen Tresor, bevor du ein signiertes PDF speicherst."); return false; }
    try {
      await saveEncryptedDocument(vaultKey, { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), size: pdf.size, pdf });
      await refreshArchive(vaultKey);
      addLog("Signiertes PDF verschlüsselt im lokalen Tresor abgelegt.");
      return true;
    } catch { toast.error("PDF konnte nicht verschlüsselt im lokalen Tresor abgelegt werden."); return false; }
  };
  const openArchivedDocument = (document: LocalSignedDocument) => {
    acceptFile(new File([document.pdf], document.name, { type: "application/pdf" }));
    toast.success("Lokales Dokument geöffnet.");
  };
  const downloadArchivedDocument = (archivedDocument: LocalSignedDocument) => {
    const blobUrl = URL.createObjectURL(archivedDocument.pdf); const link = document.createElement("a"); link.href = blobUrl; link.download = archivedDocument.name; link.click(); URL.revokeObjectURL(blobUrl);
  };
  const deleteArchivedDocument = async (document: LocalSignedDocument) => {
    await deleteEncryptedDocument(document.id); await refreshArchive(); toast.success("Verschlüsseltes Dokument gelöscht.");
  };
  const setupVault = async (passphrase: string) => {
    const key = await createLocalVault(passphrase);
    setVaultKey(key); setVaultConfigured(true); setVaultLocked(false); await refreshArchive(key);
    toast.success("Lokaler Dokumenttresor wurde eingerichtet.");
  };
  const unlockVaultWithPassword = async (passphrase: string) => {
    const key = await unlockLocalVault(passphrase);
    setVaultKey(key); setVaultLocked(false); await refreshArchive(key);
    toast.success("Dokumenttresor entsperrt.");
  };
  const unlockVaultWithFaceId = async () => {
    if (!vaultKey) throw new Error("Nach einem Browser-Neustart ist das Tresor-Passwort erforderlich.");
    const verified = await verifyFaceIdGate();
    if (!verified) throw new Error("Face ID konnte den Tresor nicht entsperren.");
    setVaultLocked(false); await refreshArchive(vaultKey); toast.success("Tresor mit Face ID entsperrt.");
  };
  const activateFaceId = async () => {
    await enableFaceIdGate(); setFaceIdEnabled(true); toast.success("Face ID für die aktive Tresorsitzung eingerichtet.");
  };
  const changeVaultPassword = async (currentPassphrase: string, nextPassphrase: string, onProgress: (progress: VaultRotationProgress) => void) => {
    const nextKey = await changeLocalVaultPassword(currentPassphrase, nextPassphrase, onProgress);
    setVaultKey(nextKey); await refreshArchive(nextKey); toast.success("Tresor-Passwort geändert und Dokumente neu verschlüsselt.");
  };
  const exportVaultBackup = async () => {
    const backup = await exportEncryptedVaultBackup();
    const backupUrl = URL.createObjectURL(backup.file);
    const link = document.createElement("a");
    link.href = backupUrl;
    link.download = `signlocal-tresor-backup-${backup.exportedAt.slice(0, 10)}.signlocal-backup`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(backupUrl), 1_000);
    addLog(`Verschlüsseltes Tresor-Backup mit ${backup.documentCount} Dokument${backup.documentCount === 1 ? "" : "en"} exportiert.`);
    toast.success(`Verschlüsseltes Backup mit ${backup.documentCount} Dokument${backup.documentCount === 1 ? "" : "en"} gespeichert.`);
  };
  const importVaultBackup = async (backupFile: File) => {
    const report = await importEncryptedVaultBackup(backupFile);
    setVaultKey(null);
    setVaultConfigured(true);
    setVaultLocked(true);
    setFaceIdEnabled(false);
    setArchivedDocuments([]);
    setArchiveReady(true);
    toast.success(`Backup mit ${report.documentCount} Dokument${report.documentCount === 1 ? "" : "en"} wiederhergestellt. Entsperre den Tresor mit dem bisherigen Passwort.`);
    return report;
  };
  const lockVault = () => { setVaultLocked(true); setArchivedDocuments([]); toast.message("Dokumenttresor gesperrt."); };

  useEffect(() => {
    const resize = () => setPageWidth(Math.max(280, Math.min(720, window.innerWidth - 48)));
    resize(); window.addEventListener("resize", resize);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    void (async () => {
      const settings = await getVaultSettings();
      setVaultConfigured(Boolean(settings)); setFaceIdEnabled(Boolean(settings?.faceIdCredentialId));
      setFaceIdAvailable(await isPlatformAuthenticatorAvailable()); setArchiveReady(true);
    })();
    void requestLocalPersistence().then(setLocalPersistence).catch(() => setLocalPersistence(false));
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    const lockWhenHidden = () => { if (document.visibilityState === "hidden" && vaultKey) { setVaultLocked(true); setArchivedDocuments([]); } };
    document.addEventListener("visibilitychange", lockWhenHidden);
    return () => document.removeEventListener("visibilitychange", lockWhenHidden);
  }, [vaultKey]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const acceptFile = (selected: File) => {
    if (selected.type !== "application/pdf") { toast.error("Auf dem iPhone ist zurzeit nur PDF vorgesehen."); return; }
    if (url) URL.revokeObjectURL(url);
    const nextUrl = URL.createObjectURL(selected);
    setFile(selected); setUrl(nextUrl); setPage(1); setPageCount(0); setSignatures([]); setRemovedSignatures([]); setSignatureTemplate(null); setPendingSignature(null); setPendingMobileSignature(false); setPendingMobileDetails({}); setMobileSignatureReviewId(null);
    setLogs([{ time: now(), message: `„${selected.name}“ lokal geöffnet.` }]);
  };
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => { const selected = event.target.files?.[0]; if (selected) acceptFile(selected); event.target.value = ""; };
  const reset = () => { if (url) URL.revokeObjectURL(url); setFile(null); setUrl(null); setSignatures([]); setRemovedSignatures([]); setSignatureTemplate(null); setPendingSignature(null); setPendingMobileSignature(false); setPendingMobileDetails({}); setMobileSignatureReviewId(null); setLogs([]); };
  const prepareSignature = (image: string) => { setDialogOpen(false); setSignatureTemplate(image); setPendingSignature(image); setPendingMobileSignature(false); setPendingMobileDetails({}); toast.success("Jetzt die Stelle im Dokument antippen."); addLog("Unterschrift vorbereitet – Position wählen."); };
  const prepareRemoteSignature = (image: string, details: { signerName?: string; signedAt?: string }) => { setSignatureTemplate(image); setPendingSignature(image); setPendingMobileSignature(true); setPendingMobileDetails(details); toast.success("Mobil-Signatur empfangen. Tippe jetzt im PDF auf die gewünschte Position."); addLog(`Mobil-Signatur${details.signerName ? ` von ${details.signerName}` : ""} lokal empfangen – Position im PDF wählen.`); };
  const reuseSignature = () => {
    if (!signatureTemplate) { setDialogOpen(true); return; }
    setPendingSignature(signatureTemplate); setPendingMobileSignature(false); setPendingMobileDetails({});
    toast.success(`Letzte Unterschrift ist für Seite ${page} bereit.`);
    addLog(`Letzte Unterschrift für Seite ${page} erneut vorbereitet.`);
  };
  const placeSignature = (event: PointerEvent<HTMLDivElement>) => {
    if (!pendingSignature) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(.75, Math.max(.02, (event.clientX - rect.left) / rect.width));
    const y = Math.min(.9, Math.max(.04, (event.clientY - rect.top) / rect.height));
    const id = crypto.randomUUID();
    setSignatures((previous) => [...previous, { id, image: pendingSignature, x, y, page, width: .26, source: pendingMobileSignature ? "mobile" : "local", signerName: pendingMobileSignature ? pendingMobileDetails.signerName : undefined, signedAt: pendingMobileSignature ? pendingMobileDetails.signedAt : undefined }]);
    setActiveSignatureId(id);
    if (pendingMobileSignature) { setMobileSignatureReviewId(id); setPendingSignature(null); setPendingMobileSignature(false); setPendingMobileDetails({}); }
    setRemovedSignatures([]);
    addLog(`Unterschrift auf Seite ${page} positioniert – weitere Position möglich.`); toast.success("Unterschrift platziert. Du kannst sie erneut setzen.");
  };
  const undoLastSignature = () => {
    const lastSignature = signatures.at(-1);
    if (!lastSignature) return toast.error("Es gibt keine platzierte Unterschrift zum Rückgängig-Machen.");
    setSignatures((previous) => previous.slice(0, -1));
    setRemovedSignatures((previous) => [...previous, lastSignature]);
    if (mobileSignatureReviewId === lastSignature.id) setMobileSignatureReviewId(null);
    if (activeSignatureId === lastSignature.id) setActiveSignatureId(null);
    addLog(`Letzte Unterschrift auf Seite ${lastSignature.page} rückgängig gemacht.`);
    toast.success("Letzte Unterschrift entfernt.");
  };
  const restoreLastSignature = () => {
    const restoredSignature = removedSignatures.at(-1);
    if (!restoredSignature) return toast.error("Es gibt keine Unterschrift zum Wiederherstellen.");
    setSignatures((previous) => [...previous, restoredSignature]);
    setRemovedSignatures((previous) => previous.slice(0, -1));
    setPage(restoredSignature.page);
    setActiveSignatureId(restoredSignature.id);
    addLog(`Unterschrift auf Seite ${restoredSignature.page} wiederhergestellt.`);
    toast.success("Unterschrift wiederhergestellt.");
  };
  const beginSignatureGesture = (event: PointerEvent<HTMLElement>, signature: Signature, mode: "move" | "resize") => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    signatureGestureRef.current = { id: signature.id, mode, startX: event.clientX, startY: event.clientY, startLeft: signature.x, startTop: signature.y, startWidth: signature.width };
    setActiveSignatureId(signature.id);
  };
  const moveSignatureGesture = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = signatureGestureRef.current; const surface = documentSurfaceRef.current;
    if (!gesture || !surface) return;
    event.stopPropagation();
    const rect = surface.getBoundingClientRect();
    const deltaX = (event.clientX - gesture.startX) / rect.width;
    const deltaY = (event.clientY - gesture.startY) / rect.height;
    setSignatures((previous) => previous.map((signature) => {
      if (signature.id !== gesture.id) return signature;
      const nextWidth = gesture.mode === "resize" ? Math.min(.65, Math.max(.12, gesture.startWidth + deltaX)) : signature.width;
      const maxY = 1 - nextWidth * .351;
      return {
        ...signature,
        width: nextWidth,
        x: Math.min(1 - nextWidth, Math.max(0, gesture.mode === "move" ? gesture.startLeft + deltaX : signature.x)),
        y: Math.min(maxY, Math.max(0, gesture.mode === "move" ? gesture.startTop + deltaY : signature.y)),
      };
    }));
  };
  const finishSignatureGesture = () => {
    if (!signatureGestureRef.current) return;
    signatureGestureRef.current = null;
    addLog("Unterschrift angepasst.");
  };
  const exportPdf = async () => {
    if (!file || !signatures.length) return toast.error("Setze vor dem Export mindestens eine Unterschrift.");
    if (mobileSignatureReviewId) return toast.error("Prüfe zuerst Position und Größe der übertragenen Mobil-Signatur.");
    setExporting(true); addLog("PDF-Export wird vorbereitet.");
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const pages = pdf.getPages();
      for (const signature of signatures) {
        const image = await pdf.embedPng(signature.image);
        const target = pages[signature.page - 1];
        const width = target.getWidth() * signature.width;
        const height = width * (image.height / image.width);
        target.drawImage(image, { x: target.getWidth() * signature.x, y: target.getHeight() * (1 - signature.y) - height, width, height });
      }
      const bytes = await pdf.save();
      const signedName = file.name.replace(/\.pdf$/i, "") + "-signiert.pdf";
      const signedPdf = new Blob([bytes], { type: "application/pdf" });
      const archived = await archiveSignedDocument(signedPdf, signedName);
      if (archived) { addLog("Signiertes PDF wurde verschlüsselt lokal gespeichert."); toast.success("Das signierte PDF liegt jetzt verschlüsselt im Tresor."); }
    } catch { toast.error("Das PDF konnte nicht exportiert werden."); addLog("PDF-Export fehlgeschlagen."); }
    finally { setExporting(false); }
  };

  if (!file || !url) return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 pb-7 pt-5 sm:px-8 sm:pt-7">
        <a href="/" className="brand-lockup flex items-center gap-3" aria-label="Signlocal Startseite"><span className="brand-lockup-mark"><img src={MARK_IMAGE} alt="" className="h-11 w-11 rounded-xl"/></span><span><span className="display block text-2xl font-bold text-[#183234]">Signlocal</span><span className="brand-lockup-note">Dein Weg zum unterschriebenen PDF</span></span></a>
        <span className="hidden items-center gap-2 rounded-full border border-[#d8d3c9] bg-white/70 px-3 py-2 text-xs font-bold text-[#506967] sm:inline-flex"><LockKeyhole size={14} className="text-[#155e63]"/> lokal im Browser</span>
      </header>
      <section className="mx-auto grid max-w-6xl gap-7 px-5 pb-12 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-12 lg:pb-20">
        <div className="rise-in order-2 lg:order-1">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#a7b9a6]/35 px-3 py-2 text-xs font-bold uppercase tracking-[.14em] text-[#155e63]"><span className="h-2 w-2 rounded-full bg-[#155e63]"/> Dein ruhiger Weg zum PDF</div>
          <h1 className="display max-w-xl text-5xl leading-[.94] text-[#183234] sm:text-6xl">Unterschreiben, ohne das Dokument aus der Hand zu geben.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#506967]">Öffne ein PDF, zeichne deine Unterschrift mit dem Finger und speichere die signierte Datei direkt auf dem iPhone.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input ref={inputRef} onChange={onFileChange} type="file" accept="application/pdf" className="hidden" />
            <button onClick={() => inputRef.current?.click()} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#155e63] px-6 text-base font-bold text-white shadow-xl shadow-[#155e63]/20 transition hover:bg-[#0d4549] active:scale-[.97]"><Upload size={19}/> PDF auswählen</button>
            <p className="text-sm leading-5 text-[#6b7d7b]">Die Datei bleibt auf deinem Gerät.</p>
          </div>
          <div className="route-steps mt-10 max-w-lg pt-5 text-sm text-[#506967]" aria-label="Dein Weg durch Signlocal"><span className="route-step"><span className="route-marker route-marker-active">1</span>PDF wählen</span><span className="route-step"><span className="route-marker route-marker-safe">2</span>Signieren</span><span className="route-step"><span className="route-marker">3</span>Im Tresor sichern</span></div>
        </div>
        <div className="rise-in-late relative order-1 lg:order-2"><div className="absolute -inset-5 rounded-[2.2rem] bg-[#a7b9a6]/30 blur-2xl"/><div className="paper-card relative overflow-hidden rounded-[2rem] bg-white p-4 sm:p-5"><div className="brand-bows" aria-hidden="true"><span/><span/></div><img src={HERO_IMAGE} alt="Abstrakter Weg aus Wegpetrol und Salbeigrün" className="h-52 w-full rounded-[1.35rem] object-cover sm:h-72"/><div className="absolute inset-x-9 bottom-9 rounded-2xl bg-[#fffdf8]/95 p-4 backdrop-blur"><div className="flex items-center gap-3"><img src={MARK_IMAGE} alt="" className="h-11 w-11 rounded-xl"/><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#155e63]">Nur drei Schritte</p><p className="mt-1 font-semibold text-[#183234]">Von der Datei bis zum Download</p></div></div></div></div></div>
      </section>
      <div className="journey-route mx-auto max-w-6xl px-5 sm:px-8" aria-hidden="true"><span/><img src={MARK_IMAGE} alt="" className="h-9 w-9 rounded-xl"/><span/></div>
      <section className="journey-stations mx-auto grid max-w-6xl gap-4 px-5 pb-10 sm:grid-cols-[.9fr_1.08fr_.86fr] sm:px-8"><article className="journey-station-first rise-in paper-card safety-surface rounded-3xl p-5"><div className="section-waymark"><img src={MARK_IMAGE} alt="" className="h-6 w-6 rounded-md"/><span>Bleibt bei dir</span></div><ShieldCheck className="mb-4 mt-5 text-[#155e63]"/><h2 className="font-bold text-[#183234]">Dein Dokument bleibt bei dir.</h2><p className="mt-2 text-sm leading-6 text-[#506967]">PDF und Unterschrift werden auf deinem Gerät verarbeitet. Es gibt keinen Dokument-Upload.</p></article><article className="journey-station-middle rise-in-late paper-card action-surface rounded-3xl p-5"><div className="section-waymark"><img src={MARK_IMAGE} alt="" className="h-6 w-6 rounded-md"/><span>Direkt weitermachen</span></div><div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#155e63] text-white shadow-md shadow-[#155e63]/20"><PenLine size={22}/></div><h2 className="mt-4 font-bold text-[#183234]">Mit dem Finger zur Unterschrift.</h2><p className="mt-2 text-sm leading-6 text-[#506967]">Große Bedienelemente führen dich ohne Umwege zur richtigen Stelle im PDF.</p></article><article className="journey-station-last rise-in-latest paper-card overflow-hidden rounded-3xl bg-[#fffdf8] p-0"><img src={DETAIL_IMAGE} alt="Abstrakte Wegmarken aus zwei verbundenen Bögen" className="h-20 w-full object-cover"/><div className="p-5"><div className="section-waymark"><img src={MARK_IMAGE} alt="" className="h-6 w-6 rounded-md"/><span>Jederzeit bereit</span></div><h2 className="mt-4 font-bold text-[#183234]">Vom Homescreen direkt zum PDF.</h2><p className="mt-2 text-sm leading-6 text-[#506967]">In Safari zum Homescreen hinzufügen – dann ist Signlocal mit einem Tipp geöffnet.</p></div></article></section>
      <div className="vault-route mx-auto max-w-6xl px-5 pt-1 sm:px-8" aria-label="Letzter Schritt: Sicher verwahren"><span/><div><img src={MARK_IMAGE} alt="" className="h-9 w-9 rounded-xl"/><p>Jetzt sicher bei dir verwahren</p></div><span/></div>
      <LocalArchive documents={archivedDocuments} ready={archiveReady} persistent={localPersistence} configured={vaultConfigured} locked={vaultLocked} faceIdAvailable={faceIdAvailable} faceIdEnabled={faceIdEnabled} canUnlockWithFaceId={Boolean(vaultKey)} onSetup={setupVault} onUnlockWithPassword={unlockVaultWithPassword} onUnlockWithFaceId={unlockVaultWithFaceId} onEnableFaceId={activateFaceId} onChangePassword={changeVaultPassword} onExportBackup={exportVaultBackup} onImportBackup={importVaultBackup} onLock={lockVault} onOpen={openArchivedDocument} onDownload={downloadArchivedDocument} onDelete={deleteArchivedDocument}/>
      {dialogOpen && <SignatureDialog onClose={() => setDialogOpen(false)} onSave={prepareSignature}/>} 
    </main>
  );

  return (
    <main className="min-h-screen bg-[#f7f3e9] pb-24">
      <header className="sticky top-0 z-30 border-b border-[#d8d3c9]/80 bg-[#f7f3e9]/90 backdrop-blur-xl"><div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-7"><div className="flex items-center gap-1"><button onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#155e63] transition active:scale-95"><ArrowLeft size={18}/><span className="hidden sm:inline">Neues Dokument</span></button><button onClick={undoLastSignature} disabled={!signatures.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#155e63] transition active:scale-95 disabled:opacity-35" aria-label="Letzte Unterschrift rückgängig machen"><RotateCcw size={18}/><span className="hidden lg:inline">Rückgängig</span></button><button onClick={restoreLastSignature} disabled={!removedSignatures.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#155e63] transition active:scale-95 disabled:opacity-35" aria-label="Letzte Unterschrift wiederherstellen"><RotateCw size={18}/><span className="hidden lg:inline">Wiederherstellen</span></button></div><div className="flex items-center gap-2"><img src={MARK_IMAGE} alt="" className="h-9 w-9 rounded-lg"/><span className="display hidden text-xl font-bold text-[#183234] sm:inline">Signlocal</span></div><button onClick={exportPdf} disabled={exporting} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155e63] px-3 text-sm font-bold text-white shadow-md transition hover:bg-[#0d4549] disabled:opacity-60 active:scale-[.97]"><>{exporting ? <Loader2 size={17} className="animate-spin"/> : <Download size={17}/>}</><span className="hidden sm:inline">PDF speichern</span></button></div></header>
      <section className="mx-auto grid max-w-6xl gap-5 px-4 pt-5 sm:px-7 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <div className="min-w-0">
          <div className="paper-card mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#fffdf8] px-4 py-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#155e63]/10 text-[#155e63]"><FileText size={20}/></div><div className="min-w-0"><p className="truncate text-sm font-bold text-[#183234]">{file.name}</p><p className="text-xs text-[#6b7d7b]">Seite {page}{pageCount ? ` von ${pageCount}` : ""}</p></div></div><div className="flex items-center gap-1 rounded-xl bg-[#f7f3e9] p-1"><button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="grid h-9 w-9 place-items-center rounded-lg text-[#155e63] disabled:opacity-35 active:scale-95" aria-label="Vorherige Seite"><ChevronLeft size={19}/></button><button onClick={() => setPage((current) => Math.min(pageCount || 1, current + 1))} disabled={!pageCount || page === pageCount} className="grid h-9 w-9 place-items-center rounded-lg text-[#155e63] disabled:opacity-35 active:scale-95" aria-label="Nächste Seite"><ChevronRight size={19}/></button></div></div>
          <div className={`paper-card relative overflow-auto rounded-[1.4rem] bg-white p-2 sm:p-4 ${pendingSignature ? "ring-4 ring-[#a7b9a6]/60" : ""}`}>
            <div ref={documentSurfaceRef} className="relative mx-auto w-fit" onPointerDown={placeSignature} role={pendingSignature ? "button" : undefined} aria-label={pendingSignature ? "Unterschrift hier platzieren" : undefined}>
              <Document file={url} loading={<div className="grid min-h-96 place-items-center text-[#506967]"><Loader2 className="animate-spin"/><span className="mt-3 text-sm">PDF wird lokal geöffnet …</span></div>} onLoadSuccess={({ numPages }) => { setPageCount(numPages); addLog(`${numPages} PDF-Seite${numPages === 1 ? "" : "n"} erkannt.`); }} error={<div className="p-10 text-center text-[#a4483d]">Dieses PDF konnte nicht angezeigt werden.</div>}>
                <div className="page-canvas"><Page pageNumber={page} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false}/></div>
              </Document>
              {pageSignatures.map((signature) => (
                <div key={signature.id} onPointerDown={(event) => beginSignatureGesture(event, signature, "move")} onPointerMove={moveSignatureGesture} onPointerUp={finishSignatureGesture} onPointerCancel={finishSignatureGesture} className={`signature-stamp absolute z-10 touch-none rounded-xl border bg-white/90 p-1.5 shadow-lg ${activeSignatureId === signature.id ? "signature-stamp-selected border-[#155e63] ring-4 ring-[#a7b9a6]/50" : "border-[#155e63]/25"}`} style={{ left: `${signature.x * 100}%`, top: `${signature.y * 100}%`, width: `${signature.width * 100}%` }} aria-label="Unterschrift verschieben">
                  <img src={signature.image} alt="Gesetzte Unterschrift" className="pointer-events-none block w-full"/>
                  <span className="signature-stamp-label pointer-events-none absolute -top-7 left-0 inline-flex items-center gap-1 rounded-full bg-[#155e63] px-2 py-1 text-[10px] font-bold text-white shadow"><Move size={11}/> Ziehen</span>
                  <button onPointerDown={(event) => { event.stopPropagation(); setSignatures((previous) => previous.filter((entry) => entry.id !== signature.id)); if (mobileSignatureReviewId === signature.id) setMobileSignatureReviewId(null); setActiveSignatureId(null); addLog("Unterschrift entfernt."); }} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-[#183234] text-white shadow-md active:scale-95" aria-label="Unterschrift entfernen"><X size={14}/></button>
                  <button onPointerDown={(event) => beginSignatureGesture(event, signature, "resize")} className="absolute -bottom-3 -right-3 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-[#e9b79a] text-[#183234] shadow-md active:scale-95" aria-label="Unterschrift größer oder kleiner ziehen"><Maximize2 size={17}/></button>
                </div>
              ))}
              {pendingSignature && <div className="absolute inset-x-0 top-4 z-20 mx-auto flex w-fit items-center gap-2 rounded-full bg-[#155e63] px-3 py-2 text-sm font-bold text-white shadow-lg"><span className="pointer-events-none">Beliebig oft antippen</span><button onPointerDown={(event) => event.stopPropagation()} onClick={() => { setPendingSignature(null); toast.success("Mehrfachplatzierung beendet."); }} className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold transition hover:bg-white/25 active:scale-95">Fertig</button></div>}
            </div>
          </div>
          {mobileSignatureReviewId && <section className="mt-4 rounded-2xl border border-[#155e63]/25 bg-[#eaf4ef] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[#155e63]" size={19}/><div className="min-w-0 flex-1"><p className="font-bold text-[#183234]">Übertragene Signatur prüfen</p><p className="mt-1 text-sm leading-5 text-[#506967]">Ziehe die Signatur im PDF an die gewünschte Position und nutze den runden Griff zum Skalieren. Erst nach deiner Bestätigung kann das PDF gespeichert werden.</p><button onClick={() => { setMobileSignatureReviewId(null); toast.success("Position und Größe der Mobil-Signatur bestätigt."); }} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#155e63] px-3 text-xs font-bold text-white active:scale-[.97]"><Check size={15}/>Position und Größe bestätigen</button></div></div></section>}
          <PageOverview pages={pageStatus} currentPage={page} pending={Boolean(pendingSignature)} hasTemplate={Boolean(signatureTemplate)} signaturePreview={signatureTemplate} onSelect={(pageNumber) => { setPage(pageNumber); setActiveSignatureId(null); }} onReuse={reuseSignature} onStop={() => { setPendingSignature(null); toast.success("Mehrfachplatzierung beendet."); }}/>
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#a7b9a6]/55 bg-[#a7b9a6]/20 p-4 text-sm leading-6 text-[#375552]"><Info className="mt-0.5 shrink-0 text-[#155e63]" size={18}/><p>Auf dem iPhone lassen sich Unterschriften direkt mit dem Finger setzen. Die Hardware-Anbindung eines Signotec-Pads bleibt bewusst der Windows-Version vorbehalten.</p></div>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20"><section className="paper-card overflow-hidden rounded-[1.5rem] bg-[#fffdf8]"><img src={ILLUSTRATION_IMAGE} alt="Abstrakter Papierweg mit Wegmarken" className="h-32 w-full object-cover"/><div className="p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">Nächster Schritt</p><h1 className="display mt-2 text-3xl leading-none text-[#183234]">Unterschrift an die richtige Stelle.</h1><p className="mt-3 text-sm leading-6 text-[#506967]">Zeichne zuerst. Tippe danach im Dokument genau auf die gewünschte Position.</p><button onClick={() => setDialogOpen(true)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#155e63] px-4 text-sm font-bold text-white shadow-lg shadow-[#155e63]/20 transition hover:bg-[#0d4549] active:scale-[.97]"><PenLine size={18}/>{pendingSignature ? "Neue Signatur zeichnen" : "Unterschrift zeichnen"}</button></div></section><LocalSignaturePairing onSignature={prepareRemoteSignature}/><section className="paper-card rounded-[1.5rem] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-bold text-[#183234]">Wegmarken</h2><span className="rounded-full bg-[#f7f3e9] px-2 py-1 text-xs font-bold text-[#506967]">{signatures.length} gesetzt</span></div><div className="mt-4 space-y-3">{logs.length ? logs.map((entry, index) => <div key={`${entry.time}-${index}`} className="flex gap-3 text-sm"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#a7b9a6]"/><p className="leading-5 text-[#506967]"><span className="mr-2 font-bold text-[#155e63]">{entry.time}</span>{entry.message}</p></div>) : <p className="text-sm leading-6 text-[#506967]">Hier erscheinen die Schritte für dieses Dokument.</p>}</div></section></aside>
      </section>
      {dialogOpen && <SignatureDialog onClose={() => setDialogOpen(false)} onSave={prepareSignature}/>} 
    </main>
  );
}
