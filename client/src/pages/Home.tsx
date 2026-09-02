/**
 * Design: „Ruhiger Wegweiser“ — die Seite führt iPhone-Nutzende in einer
 * vertikalen Abfolge von Dokument über Signatur bis Export, mit großen Touch-Zielen.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Document, Page, pdfjs } from "react-pdf";
import { toast } from "sonner";
import { changeLocalVaultPassword, createLocalVault, deleteEncryptedDocument, enableFaceIdGate, exportEncryptedVaultBackup, getVaultSettings, hasVaultSettings, importEncryptedVaultBackup, isPlatformAuthenticatorAvailable, listEncryptedDocuments, requestLocalPersistence, saveEncryptedDocument, type LocalSignedDocument, type VaultRotationProgress, unlockLocalVault, verifyFaceIdGate } from "@/lib/localArchive";
import {
  Archive, ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Download, FilePlus2,
  FileText, Info, Loader2, LockKeyhole, Mail, PenLine, Plus, RotateCcw, RotateCw, ShieldCheck,
  Maximize2, Move, Sparkles, Trash2, Upload, X,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { LocalArchive } from "@/components/LocalArchive";
import { CompanionSupport } from "@/components/CompanionSupport";
import { DocumentDiscardDialog } from "@/components/DocumentDiscardDialog";
import { LocalSignaturePairing, type LocalSignaturePairingHandle, type RemoteSignatureDetails } from "@/components/LocalSignaturePairing";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { SIGNATURE_DATE_FORMATS, signatureCaptionLines, type SignatureDateFormat } from "@/lib/signatureCaption";
import { clearSignaturePreferences, DEFAULT_SIGNATURE_PREFERENCES, loadSignaturePreferences, saveSignaturePreferences, type SignatureDateOptions } from "@/lib/signaturePreferences";
import { sharePdfWithDevice } from "@/lib/pdfShare";
import { convertDocxToPdf, isDocxFile } from "@/lib/docxToPdf";
import { convertImageToPdf, convertImagesToPdf, isSupportedImageFile, prepareImageForEditing } from "@/lib/imageToPdf";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const ImageEditorDialog = lazy(() => import("@/components/ImageEditorDialog").then((module) => ({ default: module.ImageEditorDialog })));
const ImageBatchDialog = lazy(() => import("@/components/ImageBatchDialog").then((module) => ({ default: module.ImageBatchDialog })));

const publicFile = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const HERO_IMAGE = publicFile("assets/signlocal-hero.png");
const ILLUSTRATION_IMAGE = publicFile("assets/signlocal-mobile-illustration.png");
const DETAIL_IMAGE = publicFile("assets/signlocal-path-detail.png");
const MARK_IMAGE = publicFile("assets/signlocal-brand-mark.png");
const WINDOWS_COMPANION_INSTALLER = publicFile("downloads/SignLocal-Windows-Companion-PortableHost.zip");
const MACOS_COMPANION_INSTALLER = publicFile("downloads/SignLocal-macOS-Companion-PortableHost.zip");
const MACOS_HOTSPOT_GUIDE_IMAGE = publicFile("assets/signlocal-macos-hotspot-guide.png");

type Signature = { id: string; image: string; x: number; y: number; page: number; width: number; source?: "local" | "mobile"; signerName?: string; signedAt?: string; signedPlace?: string; showDate?: boolean; dateFormat?: SignatureDateFormat };
type LogEntry = { time: string; message: string };

function SignaturePreferencesResetButton({ onClear }: { onClear: () => void }) {
  return <button onClick={onClear} className="fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#102b79]/20 bg-white/95 px-4 text-xs font-bold text-[#102b79] shadow-lg shadow-[#183234]/15 backdrop-blur transition hover:bg-[#f5faff] active:scale-[.97] sm:bottom-6 sm:right-6" aria-label="Gespeicherte Signaturvorgaben löschen"><Trash2 size={16}/>Vorgaben löschen</button>;
}

function PathStation({ number, children }: { number: string; children: string }) {
  return <li className="companion-path-station"><span aria-hidden="true">{number}</span>{children}</li>;
}

function WindowsCompanionDownload() {
  return <section className="companion-route relative mx-auto mt-10 max-w-6xl px-5 pb-14 sm:px-8" aria-label="Installation für das lokale Unterschriftenpad">
    <div aria-hidden="true" className="companion-route-line absolute bottom-5 left-5 top-5 sm:left-9"/>
    <div className="relative max-w-2xl pl-10 sm:pl-0">
      <div className="absolute -left-1 top-0 sm:-left-14"><img src={MARK_IMAGE} alt="" className="h-10 w-10 object-contain"/></div>
      <p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#155e63]">Station 04 · lokal koppeln</p>
      <h2 className="display mt-2 text-3xl leading-tight text-[#183234]">Mobilgerät als lokales Unterschriftenpad bereithalten</h2>
      <p className="mt-3 text-sm leading-6 text-[#506967]">Wähle das Paket für deinen Computer. PDF und Unterschrift bleiben im eigenen Netzwerk; beide Installationen sind nur für ein <strong>privates WLAN</strong> oder einen eigenen Offline-Hotspot bestimmt.</p>
    </div>
    <ol className="companion-path relative mt-6 pl-10 sm:pl-0" aria-label="Lokale Einrichtungsstrecke">
      <PathStation number="1">Paket wählen</PathStation><PathStation number="2">Lokal einrichten</PathStation><PathStation number="3">Privat verbinden</PathStation>
    </ol>
    <div className="relative mt-7 space-y-5 pl-10 sm:pl-0">
      <article className="companion-download-card companion-download-card-windows paper-card relative max-w-3xl overflow-hidden border border-[#a7b9a6]/55 bg-[#fffdf8] p-6 shadow-sm">
        <div aria-hidden="true" className="absolute right-0 top-0 h-20 w-20 rounded-bl-[3rem] border-b border-l border-[#155e63]/15 bg-[#eef2e9]"/>
        <div className="section-waymark"><img src={MARK_IMAGE} alt="" className="h-7 w-7 object-contain"/><span>Windows</span></div>
        <h3 className="display mt-4 text-3xl text-[#183234]">Windows-Companion</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#506967]">Ein-Klick-Installation mit lokalem TLS-Zertifikat, manuellem Start und bewusst aktivierbarem Autostart im eigenen WLAN.</p>
        <a href={WINDOWS_COMPANION_INSTALLER} download="SignLocal-Windows-Companion-Installation.zip" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#155e63] px-5 text-sm font-bold text-white shadow-md shadow-[#155e63]/20 transition hover:bg-[#0d4549] active:scale-[.97] sm:w-auto"><Download size={18}/>Windows herunterladen</a>
      </article>
      <article className="companion-download-card companion-download-card-macos paper-card relative overflow-hidden border border-[#a7b9a6]/60 bg-[#eef2e9]/70 p-6 shadow-sm lg:ml-[13%] lg:max-w-2xl">
        <div aria-hidden="true" className="absolute left-0 top-0 h-20 w-20 rounded-br-[3rem] border-b border-r border-[#a7b9a6]/45 bg-[#fffdf8]"/>
        <div className="section-waymark"><img src={MARK_IMAGE} alt="" className="h-7 w-7 object-contain"/><span>macOS</span></div>
        <h3 className="display mt-4 text-3xl text-[#183234]">macOS-Companion</h3>
        <p className="mt-2 text-sm leading-6 text-[#506967]">Doppelklick-Installer mit vollständigen lokalen Dateien, Mac-Hotspot-Anleitung und bewusst aktivierbarem Benutzer-Autostart.</p>
        <a href={MACOS_COMPANION_INSTALLER} download="SignLocal-macOS-Companion-Installation.zip" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#155e63] px-5 text-sm font-bold text-white shadow-md shadow-[#155e63]/20 transition hover:bg-[#0d4549] active:scale-[.97] sm:w-auto"><Download size={18}/>macOS-Installation herunterladen</a>
      </article>
    </div>
    <CompanionSupport hotspotImage={MACOS_HOTSPOT_GUIDE_IMAGE}/>
  </section>;
}
const INK_COLORS = [
  { id: "blue", label: "Blau", hex: "#1f5aa6" },
  { id: "black", label: "Schwarz", hex: "#1f2428" },
  { id: "red", label: "Rot", hex: "#b6383a" },
] as const;
const SIGNATURE_CANVAS_WIDTH = 740;
const SIGNATURE_CANVAS_HEIGHT = 260;
const SIGNATURE_RASTER_SCALE = 4;

function now() {
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function SignatureDialog({ onClose, onSave, personNumber = 1, signerName, onSignerNameChange, showDate, onShowDateChange, dateFormat, onDateFormatChange }: { onClose: () => void; onSave: (image: string, signedPlace?: string) => void; personNumber?: 1 | 2; signerName: string; onSignerNameChange: (value: string) => void; showDate: boolean; onShowDateChange: (value: boolean) => void; dateFormat: SignatureDateFormat; onDateFormatChange: (value: SignatureDateFormat) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [inkColor, setInkColor] = useState<(typeof INK_COLORS)[number]>(INK_COLORS[0]);
  const [signedPlace, setSignedPlace] = useState(() => loadSignaturePreferences().signerPlace);

  useEffect(() => { saveSignaturePreferences({ signerPlace: signedPlace }); }, [signedPlace]);

  const position = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (SIGNATURE_CANVAS_WIDTH / rect.width), y: (event.clientY - rect.top) * (SIGNATURE_CANVAS_HEIGHT / rect.height) };
  };

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const point = position(event);
    drawing.current = true;
    lastPoint.current = point;
    ctx.setTransform(SIGNATURE_RASTER_SCALE, 0, 0, SIGNATURE_RASTER_SCALE, 0, 0);
    ctx.lineWidth = 2.8; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = inkColor.hex;
    ctx.fillStyle = inkColor.hex;
    ctx.beginPath(); ctx.arc(point.x, point.y, Math.max(1.9, ctx.lineWidth / 2), 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(point.x, point.y);
    setHasInk(true);
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
    if (canvas && ctx) { ctx.setTransform(SIGNATURE_RASTER_SCALE, 0, 0, SIGNATURE_RASTER_SCALE, 0, 0); ctx.clearRect(0, 0, SIGNATURE_CANVAS_WIDTH, SIGNATURE_CANVAS_HEIGHT); }
    lastPoint.current = null;
    setHasInk(false);
  };
  const save = () => {
    if (!hasInk || !canvasRef.current) return toast.error("Bitte unterschreibe zuerst im Feld.");
    onSave(canvasRef.current.toDataURL("image/png"), signedPlace.trim());
  };

  return (
    <div className="signature-dialog fixed inset-0 z-50 flex items-end bg-[#183234]/35 p-3 backdrop-blur-md sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Unterschrift erstellen">
      <section className="signature-panel w-full max-w-md rounded-[1.9rem] border border-white/75 bg-[#fffdf8] p-5 shadow-2xl shadow-[#183234]/25 sm:p-7">
        <div className="signature-heading mb-5 flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#6b7d7b]">Person {personNumber} · Schritt 1 von 2</p><h2 className="display mt-1 text-3xl text-[#183234]">{personNumber === 2 ? "Zweite Unterschrift" : "Unterschrift setzen"}</h2></div>
          <button onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d8d3c9]/70 bg-white/75 text-[#155e63] shadow-sm transition active:scale-95" aria-label="Schließen"><X size={20}/></button>
        </div>
        <p className="signature-help mb-4 text-sm leading-6 text-[#506967]">{personNumber === 2 ? "Die bereits platzierte erste Unterschrift bleibt unverändert. " : ""}Zeichne mit dem Finger in Kugelschreiber-{inkColor.label}. Kleine Zitterbewegungen werden lokal und behutsam geglättet; kurze Berührungen wie der Punkt eines „i“ bleiben erhalten.</p>
        <label className="mb-4 block rounded-2xl border border-[#d8d3c9]/75 bg-white/70 p-3"><span className="block text-xs font-bold uppercase tracking-[.13em] text-[#506967]">Name von Person {personNumber} <span className="normal-case font-medium">(optional)</span></span><input value={signerName} onChange={(event) => onSignerNameChange(event.target.value.slice(0, 80))} placeholder={`z. B. Name von Person ${personNumber}`} autoComplete="name" className="mt-2 min-h-11 w-full rounded-xl border border-[#d8d3c9] bg-white px-3 text-base text-[#183234] outline-none transition focus:border-[#155e63] focus:ring-2 focus:ring-[#155e63]/20"/></label>
        <label className="mb-4 block rounded-2xl border border-[#d8d3c9]/75 bg-white/70 p-3"><span className="block text-xs font-bold uppercase tracking-[.13em] text-[#506967]">Ort <span className="normal-case font-medium">(optional)</span></span><input value={signedPlace} onChange={(event) => setSignedPlace(event.target.value.slice(0, 80))} placeholder="z. B. Münster" autoComplete="address-level2" className="mt-2 min-h-11 w-full rounded-xl border border-[#d8d3c9] bg-white px-3 text-base text-[#183234] outline-none transition focus:border-[#155e63] focus:ring-2 focus:ring-[#155e63]/20"/></label>
        <div className="mb-4 rounded-2xl border border-[#d8d3c9]/75 bg-white/70 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-[#506967]">Datum unter Unterschrift</p><p className="mt-1 text-xs leading-5 text-[#6b7d7b]">Wird beim Platzieren lokal festgehalten.</p></div><button type="button" role="switch" aria-checked={showDate} onClick={() => onShowDateChange(!showDate)} className={`relative h-8 w-14 shrink-0 rounded-full transition ${showDate ? "bg-[#155e63]" : "bg-[#d8d3c9]"}`}><span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${showDate ? "left-7" : "left-1"}`}/><span className="sr-only">Datum unter Unterschrift anzeigen</span></button></div>{showDate && <label className="mt-3 block"><span className="text-xs font-bold uppercase tracking-[.13em] text-[#506967]">Datumsformat</span><select value={dateFormat} onChange={(event) => onDateFormatChange(event.target.value as SignatureDateFormat)} className="mt-2 min-h-11 w-full rounded-xl border border-[#d8d3c9] bg-white px-3 text-sm font-semibold text-[#183234] outline-none focus:border-[#155e63] focus:ring-2 focus:ring-[#155e63]/20">{SIGNATURE_DATE_FORMATS.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}</select></label>}</div>
        <div className="mb-4 rounded-2xl border border-[#d8d3c9]/75 bg-white/70 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.13em] text-[#506967]">Kugelschreiberfarbe</span><span className="text-sm font-bold" style={{ color: inkColor.hex }}>{inkColor.label}</span></div><div className="grid grid-cols-3 gap-2">{INK_COLORS.map((option) => <button key={option.id} onClick={() => { if (hasInk) clear(); setInkColor(option); }} aria-pressed={inkColor.id === option.id} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-bold transition active:scale-[.97] ${inkColor.id === option.id ? "border-[#155e63] bg-[#f7f3e9] shadow-sm" : "border-transparent bg-white text-[#506967]"}`}><span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: option.hex }}/>{option.label}{inkColor.id === option.id && <Check size={14} className="text-[#155e63]"/>}</button>)}</div></div>
        <div className="signature-canvas-wrap overflow-hidden rounded-[1.45rem] border border-[#a7b9a6]/55 bg-gradient-to-br from-[#eef2e9] via-[#f7f3e9] to-[#f0e6da] p-2 shadow-inner shadow-[#a7b9a6]/20">
          <canvas ref={canvasRef} width={SIGNATURE_CANVAS_WIDTH * SIGNATURE_RASTER_SCALE} height={SIGNATURE_CANVAS_HEIGHT * SIGNATURE_RASTER_SCALE} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} className="signature-canvas h-40 w-full touch-none cursor-crosshair rounded-[1.05rem] bg-[#fffefb]" style={{ touchAction: "none", boxShadow: `inset 0 0 0 2px ${inkColor.hex}14` }} />
        </div>
        <div className="signature-actions mt-5 flex items-center justify-between gap-3">
          <button onClick={clear} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#155e63] transition active:scale-95"><RotateCcw size={17}/> Neu zeichnen</button>
          <button onClick={save} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#155e63] px-5 text-sm font-bold text-white shadow-lg shadow-[#155e63]/20 transition hover:bg-[#0d4549] active:scale-[.97]"><Check size={17}/>{personNumber === 2 ? "Zusätzlich platzieren" : "Position wählen"}</button>
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
  const localSignaturePairingRef = useRef<LocalSignaturePairingHandle>(null);
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
  const [pendingMobileDetails, setPendingMobileDetails] = useState<RemoteSignatureDetails>({});
  const [mobileSignatureReviewId, setMobileSignatureReviewId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [officePadReady, setOfficePadReady] = useState(false);
  const [dialogPersonNumber, setDialogPersonNumber] = useState<1 | 2>(1);
  const [pendingLocalPersonNumber, setPendingLocalPersonNumber] = useState<1 | 2>(1);
  const storedSignaturePreferences = useMemo(() => loadSignaturePreferences(), []);
  const [signerNames, setSignerNames] = useState<Record<1 | 2, string>>(storedSignaturePreferences.signerNames);
  const [dateOptions, setDateOptions] = useState<Record<1 | 2, SignatureDateOptions>>(storedSignaturePreferences.dateOptions);
  const [pendingLocalDateOption, setPendingLocalDateOption] = useState<{ show: boolean; format: SignatureDateFormat }>({ show: true, format: "de" });
  const [pendingLocalPlace, setPendingLocalPlace] = useState("");
  const [newDocumentConfirmationOpen, setNewDocumentConfirmationOpen] = useState(false);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [exporting, setExporting] = useState(false);
  const [preparedPdf, setPreparedPdf] = useState<{ pdf: Blob; name: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareFallback, setShareFallback] = useState<"files" | "email" | null>(null);
  const [conversionKind, setConversionKind] = useState<"docx" | "image" | null>(null);
  const [imageForEditing, setImageForEditing] = useState<{ file: File; originalName: string } | null>(null);
  const [imagesForBatch, setImagesForBatch] = useState<File[] | null>(null);
  const previewUrl = useMemo(() => preparedPdf ? URL.createObjectURL(preparedPdf.pdf) : null, [preparedPdf]);

  useEffect(() => { saveSignaturePreferences({ signerNames, dateOptions }); }, [signerNames, dateOptions]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const pageSignatures = useMemo(() => signatures.filter((signature) => signature.page === page), [signatures, page]);
  const pageStatus = useMemo(() => Array.from({ length: pageCount }, (_, index) => ({ number: index + 1, count: signatures.filter((signature) => signature.page === index + 1).length })), [pageCount, signatures]);
  const addLog = (message: string) => setLogs((previous) => [{ time: now(), message }, ...previous].slice(0, 5));
  const clearStoredSignaturePreferences = () => {
    clearSignaturePreferences();
    setSignerNames(structuredClone(DEFAULT_SIGNATURE_PREFERENCES.signerNames));
    setDateOptions(structuredClone(DEFAULT_SIGNATURE_PREFERENCES.dateOptions));
    setPendingLocalDateOption({ show: true, format: "de" });
    setPendingLocalPlace("");
    addLog("Lokale Namens-, Orts- und Datums-Vorgaben gelöscht.");
    toast.success("Gespeicherte Signaturvorgaben wurden lokal gelöscht. Das aktuelle Dokument bleibt unverändert.");
  };
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
  const openPdfPreview = (_pdf?: Blob, _name?: string) => { if (preparedPdf) setPreviewOpen(true); };
  const focusVault = () => {
    document.getElementById("local-archive")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => document.getElementById(vaultConfigured ? "vault-unlock-password" : "vault-setup-password")?.focus(), 500);
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

  const acceptPdfFile = (selected: File) => {
    if (selected.type !== "application/pdf") { toast.error("Auf dem iPhone ist zurzeit nur PDF vorgesehen."); return; }
    if (url) URL.revokeObjectURL(url);
    const nextUrl = URL.createObjectURL(selected);
    const preferences = loadSignaturePreferences();
    setFile(selected); setUrl(nextUrl); setPage(1); setPageCount(0); setSignatures([]); setRemovedSignatures([]); setSignatureTemplate(null); setPendingSignature(null); setPendingMobileSignature(false); setPendingMobileDetails({}); setMobileSignatureReviewId(null); setSignerNames(preferences.signerNames); setDateOptions(preferences.dateOptions); setPreparedPdf(null); setPreviewOpen(false); setShareFallback(null);
    setLogs([{ time: now(), message: `„${selected.name}“ lokal geöffnet.` }]);
  };
  const acceptFile = async (selected: File) => {
    if (isDocxFile(selected)) {
      setConversionKind("docx");
      try {
        const converted = await convertDocxToPdf(selected);
        acceptPdfFile(converted);
        addLog(`„${selected.name}“ vollständig lokal in eine PDF-Kopie konvertiert.`);
        toast.success("Word-Datei lokal in eine PDF-Kopie umgewandelt. Prüfe nun die Vorschau.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Die Word-Datei konnte nicht lokal konvertiert werden.");
      } finally { setConversionKind(null); }
      return;
    }
    if (isSupportedImageFile(selected)) {
      setConversionKind("image");
      try {
        setImageForEditing({ file: await prepareImageForEditing(selected), originalName: selected.name });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Das Bild konnte nicht lokal konvertiert werden.");
      } finally { setConversionKind(null); }
      return;
    }
    acceptPdfFile(selected);
  };
  const acceptFiles = async (selected: File[]) => {
    if (selected.length === 1) { await acceptFile(selected[0]); return; }
    if (!selected.every(isSupportedImageFile)) { toast.error("Mehrere Dateien können zurzeit nur als PNG, JPEG oder HEIC gemeinsam vorbereitet werden."); return; }
    if (selected.length > 20) { toast.error("Wähle höchstens 20 Bilder für eine gemeinsame PDF aus."); return; }
    setConversionKind("image");
    try { setImagesForBatch(await Promise.all(selected.map(prepareImageForEditing))); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Die Bilder konnten nicht lokal vorbereitet werden."); }
    finally { setConversionKind(null); }
  };
  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => { const selected = Array.from(event.target.files ?? []); event.target.value = ""; if (selected.length) await acceptFiles(selected); };
  const applyEditedImage = async (edited: File, reportProgress: (progress: import("@/lib/imageToPdf").ImageProcessingProgress) => void, isCancelled: () => boolean) => {
    if (isCancelled()) return;
    setConversionKind("image");
    try {
      reportProgress({ value: 68, label: "PDF-Kopie wird vorbereitet …" });
      const converted = await convertImageToPdf(edited, (progress) => reportProgress({ value: 68 + Math.round(progress.value * 0.32), label: progress.label }));
      if (isCancelled()) return;
      acceptPdfFile(converted);
      addLog("Bild lokal bearbeitet und als PDF-Kopie vorbereitet.");
      reportProgress({ value: 100, label: "PDF-Kopie ist bereit." });
      toast.success("Bildbearbeitung übernommen. Prüfe nun die PDF-Vorschau.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Das bearbeitete Bild konnte nicht lokal konvertiert werden.");
      throw error;
    } finally { setConversionKind(null); }
  };
  const applyImageBatch = async (images: File[], reportProgress: (progress: import("@/lib/imageToPdf").ImageProcessingProgress) => void) => {
    setConversionKind("image");
    try {
      const converted = await convertImagesToPdf(images, reportProgress);
      acceptPdfFile(converted);
      addLog(`${images.length} Bilder vollständig lokal in eine gemeinsame PDF-Kopie konvertiert.`);
      setImagesForBatch(null);
      toast.success("Bildreihenfolge übernommen. Die gemeinsame PDF-Vorschau ist bereit.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Die Bilder konnten nicht lokal in eine PDF konvertiert werden."); }
    finally { setConversionKind(null); }
  };
  const reset = () => { if (url) URL.revokeObjectURL(url); setFile(null); setUrl(null); setSignatures([]); setRemovedSignatures([]); setSignatureTemplate(null); setPendingSignature(null); setPendingMobileSignature(false); setPendingMobileDetails({}); setMobileSignatureReviewId(null); setPreparedPdf(null); setPreviewOpen(false); setShareFallback(null); setLogs([]); };
  const discardCurrentDocument = () => { setNewDocumentConfirmationOpen(false); reset(); };
  const prepareSignature = (image: string, signedPlace = "") => { const personNumber = dialogPersonNumber; const signerName = signerNames[personNumber].trim() || `Person ${personNumber}`; setDialogOpen(false); setDialogPersonNumber(1); setSignatureTemplate(image); setPendingSignature(image); setPendingLocalPersonNumber(personNumber); setPendingLocalDateOption(dateOptions[personNumber]); setPendingLocalPlace(signedPlace); setPendingMobileSignature(false); setPendingMobileDetails({}); toast.success(`Unterschrift von ${signerName} ist bereit. Tippe jetzt die Stelle im Dokument an.`); addLog(`Unterschrift von ${signerName} vorbereitet – Position wählen.`); };
  const startSecondPersonSignature = () => { setPendingSignature(null); setPendingMobileSignature(false); setPendingMobileDetails({}); setDialogPersonNumber(2); setDialogOpen(true); };
  const prepareRemoteSignature = (image: string, details: RemoteSignatureDetails) => { setSignatureTemplate(image); setPendingSignature(image); setPendingMobileSignature(true); setPendingMobileDetails(details); toast.success("Mobil-Signatur empfangen. Tippe jetzt im PDF auf die gewünschte Position."); addLog(`Mobil-Signatur${details.signerName ? ` von ${details.signerName}` : ""} lokal empfangen – Position im PDF wählen.`); };
  const requestSignature = () => { if (officePadReady && localSignaturePairingRef.current) { localSignaturePairingRef.current.requestOfficeSignature(); return; } setDialogOpen(true); };
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
    setSignatures((previous) => [...previous, { id, image: pendingSignature, x, y, page, width: .26, source: pendingMobileSignature ? "mobile" : "local", signerName: pendingMobileSignature ? pendingMobileDetails.signerName : (signerNames[pendingLocalPersonNumber].trim() || `Person ${pendingLocalPersonNumber}`), signedAt: pendingMobileSignature ? pendingMobileDetails.signedAt : (pendingLocalDateOption.show ? new Date().toISOString() : undefined), signedPlace: pendingMobileSignature ? pendingMobileDetails.signedPlace : pendingLocalPlace, showDate: pendingMobileSignature ? pendingMobileDetails.showDate !== false : pendingLocalDateOption.show, dateFormat: pendingMobileSignature ? (pendingMobileDetails.dateFormat ?? "de") : pendingLocalDateOption.format }]);
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
  const createSignedPdf = async () => {
    if (!file || !signatures.length) { toast.error("Setze vor dem Export mindestens eine Unterschrift."); return null; }
    if (mobileSignatureReviewId) { toast.error("Prüfe zuerst Position und Größe der übertragenen Mobil-Signatur."); return null; }
    const pdf = await PDFDocument.load(await file.arrayBuffer());
    const pages = pdf.getPages();
    for (const signature of signatures) {
      const image = await pdf.embedPng(signature.image);
      const target = pages[signature.page - 1];
      const width = target.getWidth() * signature.width;
      const height = width * (image.height / image.width);
      const imageX = target.getWidth() * signature.x;
      const imageY = target.getHeight() * (1 - signature.y) - height;
      target.drawImage(image, { x: imageX, y: imageY, width, height });
      const captionLines = signatureCaptionLines(signature.signerName, signature.signedAt, signature.dateFormat, signature.showDate, signature.signedPlace);
      const captionSize = Math.max(6.5, Math.min(9, width * .032));
      const captionHeight = captionLines.length * (captionSize + 2);
      let captionY = imageY >= captionHeight + 6 ? imageY - captionSize - 2 : Math.min(target.getHeight() - captionSize - 4, imageY + height + captionHeight - captionSize);
      for (const captionLine of captionLines) { target.drawText(captionLine, { x: imageX, y: captionY, size: captionSize, color: rgb(.11, .20, .20), maxWidth: width }); captionY -= captionSize + 2; }
    }
    const bytes = await pdf.save();
    return { pdf: new Blob([bytes], { type: "application/pdf" }), name: file.name.replace(/\.pdf$/i, "") + "-signiert.pdf" };
  };
  const exportPdf = async () => {
    setExporting(true); addLog("PDF-Download wird vorbereitet.");
    try {
      const signed = await createSignedPdf();
      if (!signed) return;
      setPreparedPdf(signed); setPreviewOpen(false);
      setShareFallback(null);
      addLog("Signiertes PDF ist zum Teilen und Sichern bereit.");
      toast.success("PDF ist fertig. Tippe jetzt auf „Teilen & In Dateien sichern“.");
    } catch { toast.error("Das PDF konnte nicht exportiert werden."); addLog("PDF-Export fehlgeschlagen."); }
    finally { setExporting(false); }
  };
  const sharePreparedPdf = async (destination: "files" | "email" = "files") => {
    if (!preparedPdf) return;
    const result = await sharePdfWithDevice(preparedPdf.pdf, preparedPdf.name);
    if (result === "shared") { addLog(destination === "email" ? "Native Teilen-Auswahl für E-Mail geöffnet." : "Native iPhone-Teilen-Auswahl geöffnet."); toast.success(destination === "email" ? "Wähle in der Teilen-Auswahl „Mail“. Die PDF ist als Anhang bereit." : "Wähle in der Teilen-Auswahl „In Dateien sichern“."); return; }
    if (result === "cancelled") { toast.message("Teilen wurde abgebrochen. Die PDF bleibt hier bereit."); return; }
    setShareFallback(destination);
    toast.message(destination === "email" ? "Die E-Mail-Auswahl ist hier nicht verfügbar. Nutze die PDF-Vorschau und danach Teilen > Mail." : "Die Teilen-Auswahl ist hier nicht verfügbar. Nutze die PDF-Vorschau und danach Teilen.");
  };
  const savePdfToVault = async () => {
    if (!vaultConfigured || !vaultKey || vaultLocked) { focusVault(); return; }
    setExporting(true); addLog("Verschlüsseltes Speichern im Tresor wird vorbereitet.");
    try {
      const signed = await createSignedPdf();
      if (!signed) return;
      const archived = await archiveSignedDocument(signed.pdf, signed.name);
      if (archived) { addLog("Signiertes PDF verschlüsselt im lokalen Tresor abgelegt."); toast.success("Das signierte PDF liegt jetzt verschlüsselt im Tresor."); }
    } catch { toast.error("Das PDF konnte nicht im Tresor gespeichert werden."); addLog("Tresor-Speicherung fehlgeschlagen."); }
    finally { setExporting(false); }
  };

  if (!file || !url) return (
    <main className="min-h-screen overflow-hidden">
      {imageForEditing && <Suspense fallback={null}><ImageEditorDialog file={imageForEditing.file} originalName={imageForEditing.originalName} onCancel={() => setImageForEditing(null)} onConfirm={applyEditedImage} onComplete={() => setImageForEditing(null)} /></Suspense>}
      {imagesForBatch && <Suspense fallback={null}><ImageBatchDialog files={imagesForBatch} onCancel={() => setImagesForBatch(null)} onConfirm={applyImageBatch} /></Suspense>}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 pb-7 pt-5 sm:px-8 sm:pt-7">
        <a href="/" className="brand-lockup flex items-center gap-3" aria-label="Signlocal Startseite"><span className="brand-lockup-mark"><img src={MARK_IMAGE} alt="" className="h-12 w-12 object-contain"/></span><span><span className="display block text-2xl font-bold tracking-tight text-[#155e63]">Signlocal</span><span className="brand-lockup-note">Dein Weg zum unterschriebenen PDF</span></span></a>
        <span className="hidden items-center gap-2 rounded-full border border-[#d8d3c9] bg-white/70 px-3 py-2 text-xs font-bold text-[#506967] sm:inline-flex"><LockKeyhole size={14} className="text-[#155e63]"/> lokal im Browser</span>
      </header>
      <section className="mx-auto grid max-w-6xl gap-7 px-5 pb-12 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-12 lg:pb-20">
        <div className="rise-in order-2 lg:order-1">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#a7b9a6]/35 px-3 py-2 text-xs font-bold uppercase tracking-[.14em] text-[#155e63]"><span className="h-2 w-2 rounded-full bg-[#155e63]"/> Dein ruhiger Weg zum PDF</div>
          <h1 className="display max-w-xl text-5xl leading-[.94] text-[#183234] sm:text-6xl">Unterschreiben, ohne das Dokument aus der Hand zu geben.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#506967]">Öffne ein PDF, eine Word-Datei oder ein Bild, zeichne deine Unterschrift mit dem Finger und speichere die signierte PDF direkt auf dem iPhone.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input ref={inputRef} onChange={onFileChange} type="file" accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,image/png,.png,image/jpeg,.jpg,.jpeg,image/heic,.heic,image/heif,.heif" className="hidden" />
            <button onClick={() => inputRef.current?.click()} disabled={Boolean(conversionKind)} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#155e63] px-6 text-base font-bold text-white shadow-xl shadow-[#155e63]/20 transition hover:bg-[#0d4549] disabled:opacity-60 active:scale-[.97]">{conversionKind ? <Loader2 size={19} className="animate-spin"/> : <Upload size={19}/>} {conversionKind === "docx" ? "Word wird konvertiert …" : conversionKind === "image" ? "Bild wird vorbereitet …" : "PDF, Word oder Bild wählen"}</button>
            <p className="text-sm leading-5 text-[#6b7d7b]">PDF, DOCX und Bilder bleiben auf deinem Gerät.</p>
          </div>
          <p className="mt-3 max-w-lg text-xs leading-5 text-[#6b7d7b]">Word-Dateien sowie PNG, JPEG und HEIC werden lokal als PDF-Kopie vorbereitet. Bei komplexen Word-Layouts oder sehr großen Bildern kann die Darstellung abweichen.</p>
          <div className="route-steps mt-10 max-w-lg pt-5 text-sm text-[#506967]" aria-label="Dein Weg durch Signlocal"><span className="route-step"><span className="route-marker route-marker-active">1</span>PDF wählen</span><span className="route-step"><span className="route-marker route-marker-safe">2</span>Signieren</span><span className="route-step"><span className="route-marker">3</span>PDF sichern</span></div>
        </div>
        <div className="rise-in-late relative order-1 lg:order-2"><div className="absolute -inset-5 rounded-[2.2rem] bg-[#a7b9a6]/30 blur-2xl"/><div className="paper-card relative overflow-hidden rounded-[2rem] bg-white p-4 sm:p-5"><div className="brand-bows" aria-hidden="true"><span/><span/></div><img src={HERO_IMAGE} alt="Abstrakter Weg aus Wegpetrol und Salbeigrün" className="h-52 w-full rounded-[1.35rem] object-cover sm:h-72"/><div className="absolute inset-x-9 bottom-9 rounded-2xl bg-[#fffdf8]/95 p-4 backdrop-blur"><div className="flex items-center gap-3"><img src={MARK_IMAGE} alt="" className="h-11 w-11 rounded-xl"/><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#155e63]">Nur drei Schritte</p><p className="mt-1 font-semibold text-[#183234]">Von der Datei bis zum Download</p></div></div></div></div></div>
      </section>
      <div className="journey-route mx-auto max-w-6xl px-5 sm:px-8" aria-hidden="true"><span/><img src={MARK_IMAGE} alt="" className="h-9 w-9 rounded-xl"/><span/></div>
      <section className="journey-stations mx-auto grid max-w-6xl gap-4 px-5 pb-10 sm:grid-cols-[.9fr_1.08fr_.86fr] sm:px-8"><article className="journey-station-first rise-in paper-card safety-surface rounded-3xl p-5"><div className="section-waymark"><img src={MARK_IMAGE} alt="" className="h-6 w-6 rounded-md"/><span>Bleibt bei dir</span></div><ShieldCheck className="mb-4 mt-5 text-[#155e63]"/><h2 className="font-bold text-[#183234]">Dein Dokument bleibt bei dir.</h2><p className="mt-2 text-sm leading-6 text-[#506967]">PDF und Unterschrift werden auf deinem Gerät verarbeitet. Es gibt keinen Dokument-Upload.</p></article><article className="journey-station-middle rise-in-late paper-card action-surface rounded-3xl p-5"><div className="section-waymark"><img src={MARK_IMAGE} alt="" className="h-6 w-6 rounded-md"/><span>Direkt weitermachen</span></div><div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#155e63] text-white shadow-md shadow-[#155e63]/20"><PenLine size={22}/></div><h2 className="mt-4 font-bold text-[#183234]">Mit dem Finger zur Unterschrift.</h2><p className="mt-2 text-sm leading-6 text-[#506967]">Große Bedienelemente führen dich ohne Umwege zur richtigen Stelle im PDF.</p></article><article className="journey-station-last rise-in-latest paper-card overflow-hidden rounded-3xl bg-[#fffdf8] p-0"><img src={DETAIL_IMAGE} alt="Abstrakte Wegmarken aus zwei verbundenen Bögen" className="h-20 w-full object-cover"/><div className="p-5"><div className="section-waymark"><img src={MARK_IMAGE} alt="" className="h-6 w-6 rounded-md"/><span>Jederzeit bereit</span></div><h2 className="mt-4 font-bold text-[#183234]">Vom Homescreen direkt zum PDF.</h2><p className="mt-2 text-sm leading-6 text-[#506967]">In Safari zum Homescreen hinzufügen – dann ist Signlocal mit einem Tipp geöffnet.</p></div></article></section>
<div className="vault-route mx-auto max-w-6xl px-5 pt-1 sm:px-8" aria-label="Letzter Schritt: Sicher verwahren"><span/><div><img src={MARK_IMAGE} alt="" className="h-9 w-9 rounded-xl"/><p>Jetzt sicher bei dir verwahren</p></div><span/></div>
<LocalArchive documents={archivedDocuments} ready={archiveReady} persistent={localPersistence} configured={vaultConfigured} locked={vaultLocked} faceIdAvailable={faceIdAvailable} faceIdEnabled={faceIdEnabled} canUnlockWithFaceId={Boolean(vaultKey)} onSetup={setupVault} onUnlockWithPassword={unlockVaultWithPassword} onUnlockWithFaceId={unlockVaultWithFaceId} onEnableFaceId={activateFaceId} onChangePassword={changeVaultPassword} onExportBackup={exportVaultBackup} onImportBackup={importVaultBackup} onLock={lockVault} onOpen={openArchivedDocument} onDownload={downloadArchivedDocument} onDelete={deleteArchivedDocument}/>
      <WindowsCompanionDownload />
      {dialogOpen && <SignatureDialog personNumber={dialogPersonNumber} signerName={signerNames[dialogPersonNumber]} onSignerNameChange={(value) => setSignerNames((previous) => ({ ...previous, [dialogPersonNumber]: value }))} showDate={dateOptions[dialogPersonNumber].show} onShowDateChange={(value) => setDateOptions((previous) => ({ ...previous, [dialogPersonNumber]: { ...previous[dialogPersonNumber], show: value } }))} dateFormat={dateOptions[dialogPersonNumber].format} onDateFormatChange={(value) => setDateOptions((previous) => ({ ...previous, [dialogPersonNumber]: { ...previous[dialogPersonNumber], format: value } }))} onClose={() => { setDialogOpen(false); setDialogPersonNumber(1); }} onSave={prepareSignature}/>}
</main>
  );

  return (
    <main className="min-h-screen bg-[#f7f3e9] pb-24">
      {previewOpen && preparedPdf && previewUrl && <PdfPreviewDialog url={previewUrl} name={preparedPdf.name} onClose={() => setPreviewOpen(false)} />}
      <DocumentDiscardDialog open={newDocumentConfirmationOpen} onKeep={() => setNewDocumentConfirmationOpen(false)} onDiscard={discardCurrentDocument} />
      {imageForEditing && <Suspense fallback={null}><ImageEditorDialog file={imageForEditing.file} originalName={imageForEditing.originalName} onCancel={() => setImageForEditing(null)} onConfirm={applyEditedImage} onComplete={() => setImageForEditing(null)} /></Suspense>}
      {imagesForBatch && <Suspense fallback={null}><ImageBatchDialog files={imagesForBatch} onCancel={() => setImagesForBatch(null)} onConfirm={applyImageBatch} /></Suspense>}
      <SignaturePreferencesResetButton onClear={clearStoredSignaturePreferences} />
      <header className="sticky top-0 z-30 border-b border-[#d8d3c9]/80 bg-[#f7f3e9]/90 backdrop-blur-xl"><div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-7"><div className="flex items-center gap-1"><button onClick={() => setNewDocumentConfirmationOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#155e63] transition active:scale-95"><ArrowLeft size={18}/><span className="hidden sm:inline">Neues Dokument</span></button><button onClick={undoLastSignature} disabled={!signatures.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#155e63] transition active:scale-95 disabled:opacity-35" aria-label="Letzte Unterschrift rückgängig machen"><RotateCcw size={18}/><span className="hidden lg:inline">Rückgängig</span></button><button onClick={restoreLastSignature} disabled={!removedSignatures.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#155e63] transition active:scale-95 disabled:opacity-35" aria-label="Letzte Unterschrift wiederherstellen"><RotateCw size={18}/><span className="hidden lg:inline">Wiederherstellen</span></button></div><div className="flex items-center gap-2"><img src={MARK_IMAGE} alt="" className="h-9 w-9 object-contain"/><span className="display hidden text-xl font-bold tracking-tight text-[#155e63] sm:inline">Signlocal</span></div><button onClick={exportPdf} disabled={exporting} aria-label="Signiertes PDF zum Sichern vorbereiten" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155e63] px-3 text-sm font-bold text-white shadow-md transition hover:bg-[#0d4549] disabled:opacity-60 active:scale-[.97]"><>{exporting ? <Loader2 size={17} className="animate-spin"/> : <Download size={17}/>}</><span className="hidden sm:inline">PDF sichern</span></button></div></header>
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
                  <span className="signature-stamp-label pointer-events-none absolute -top-7 left-0 inline-flex items-center gap-1 rounded-full bg-[#155e63] px-2 py-1 text-[10px] font-bold text-white shadow"><Move size={11}/> {signature.signerName ? `${signature.signerName} · Ziehen` : "Ziehen"}</span>
                  <button onPointerDown={(event) => { event.stopPropagation(); setSignatures((previous) => previous.filter((entry) => entry.id !== signature.id)); if (mobileSignatureReviewId === signature.id) setMobileSignatureReviewId(null); setActiveSignatureId(null); addLog("Unterschrift entfernt."); }} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-[#183234] text-white shadow-md active:scale-95" aria-label="Unterschrift entfernen"><X size={14}/></button>
                  <button onPointerDown={(event) => beginSignatureGesture(event, signature, "resize")} className="absolute -bottom-3 -right-3 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-[#e9b79a] text-[#183234] shadow-md active:scale-95" aria-label="Unterschrift größer oder kleiner ziehen"><Maximize2 size={17}/></button>
                </div>
              ))}
              {pendingSignature && <div className="absolute inset-x-0 top-4 z-20 mx-auto flex w-fit items-center gap-2 rounded-full bg-[#155e63] px-3 py-2 text-sm font-bold text-white shadow-lg"><span className="pointer-events-none">Beliebig oft antippen</span><button onPointerDown={(event) => event.stopPropagation()} onClick={() => { setPendingSignature(null); toast.success("Mehrfachplatzierung beendet."); }} className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold transition hover:bg-white/25 active:scale-95">Fertig</button></div>}
            </div>
          </div>
          {mobileSignatureReviewId && <section className="mt-4 rounded-2xl border border-[#155e63]/25 bg-[#eaf4ef] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[#155e63]" size={19}/><div className="min-w-0 flex-1"><p className="font-bold text-[#183234]">Übertragene Signatur prüfen</p><p className="mt-1 text-sm leading-5 text-[#506967]">Ziehe die Signatur im PDF an die gewünschte Position und nutze den runden Griff zum Skalieren. Erst nach deiner Bestätigung kann das PDF gespeichert werden.</p><button onClick={() => { setMobileSignatureReviewId(null); toast.success("Position und Größe der Mobil-Signatur bestätigt."); }} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#155e63] px-3 text-xs font-bold text-white active:scale-[.97]"><Check size={15}/>Position und Größe bestätigen</button></div></div></section>}
          <PageOverview pages={pageStatus} currentPage={page} pending={Boolean(pendingSignature)} hasTemplate={Boolean(signatureTemplate)} signaturePreview={signatureTemplate} onSelect={(pageNumber) => { setPage(pageNumber); setActiveSignatureId(null); }} onReuse={reuseSignature} onStop={() => { setPendingSignature(null); toast.success("Mehrfachplatzierung beendet."); }}/>
          {signatures.some((signature) => signature.source === "local") && <section className="mb-4 rounded-2xl border border-[#155e63]/25 bg-[#eaf4ef] p-4"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#155e63] shadow-sm"><Plus size={20}/></div><div className="min-w-0 flex-1"><p className="font-bold text-[#183234]">Zweite Person unterschreibt</p><p className="mt-1 text-sm leading-5 text-[#506967]">Die erste Unterschrift bleibt an ihrer Stelle. Person 2 zeichnet jetzt ihre eigene Unterschrift und platziert sie unabhängig.</p><button onClick={startSecondPersonSignature} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#155e63]/30 bg-white px-4 text-sm font-bold text-[#155e63] active:scale-[.97]"><PenLine size={16}/> Unterschrift von Person 2</button></div></div></section>}
          {preparedPdf && <section className="mt-4 rounded-2xl border border-[#155e63]/25 bg-[#eaf4ef] p-4" aria-label="Signiertes PDF sichern"><div className="flex items-start gap-3"><Download className="mt-0.5 shrink-0 text-[#155e63]" size={20}/><div className="min-w-0 flex-1"><p className="font-bold text-[#183234]">Signiertes PDF ist bereit</p><p className="mt-1 text-sm leading-5 text-[#506967]">Wähle einen Weg zum Sichern oder Versenden. Die PDF bleibt bis zu deiner Auswahl nur auf diesem Gerät.</p><div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3"><button onClick={() => sharePreparedPdf("email")} aria-label="Signiertes PDF als E-Mail-Anhang vorbereiten" className="inline-flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-[#155e63] px-1.5 text-center text-[11px] font-bold leading-3 text-white shadow-sm transition active:scale-[.97] sm:min-h-12 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm sm:leading-normal"><Mail size={19} strokeWidth={2.2}/><span className="sm:hidden">E-Mail</span><span className="hidden sm:inline">E-Mail mit PDF</span></button><button onClick={() => sharePreparedPdf("files")} aria-label="Signiertes PDF in Dateien sichern" className="inline-flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-[#155e63]/30 bg-white px-1.5 text-center text-[11px] font-bold leading-3 text-[#155e63] shadow-sm transition active:scale-[.97] sm:min-h-12 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm sm:leading-normal"><Upload size={19} strokeWidth={2.2}/><span className="sm:hidden">Dateien</span><span className="hidden sm:inline">In Dateien sichern</span></button><button onClick={() => openPdfPreview(preparedPdf.pdf, preparedPdf.name)} aria-label="PDF-Vorschau öffnen" className="inline-flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-[#155e63]/30 bg-white px-1.5 text-center text-[11px] font-bold leading-3 text-[#155e63] shadow-sm transition active:scale-[.97] sm:min-h-12 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm sm:leading-normal"><FileText size={19} strokeWidth={2.2}/><span className="sm:hidden">Vorschau</span><span className="hidden sm:inline">PDF-Vorschau</span></button></div>{shareFallback && <p className="mt-3 rounded-xl bg-white/75 p-3 text-sm leading-5 text-[#506967]">Falls Safari keine Teilen-Auswahl öffnet: Öffne die PDF-Vorschau, tippe dort auf das Teilen-Symbol und wähle anschließend <strong>{shareFallback === "email" ? "Mail" : "In Dateien sichern"}</strong>.</p>}</div></div></section>}
          {!vaultConfigured && <section className="mt-4 rounded-2xl border border-[#155e63]/25 bg-[#eaf4ef] p-4" aria-label="Optionaler lokaler Dokumenttresor"><div className="flex items-start gap-3"><Archive className="mt-0.5 shrink-0 text-[#155e63]" size={20}/><div className="min-w-0 flex-1"><p className="font-bold text-[#183234]">PDF teilen oder sicher verwahren</p><p className="mt-1 text-sm leading-5 text-[#506967]">Du hast noch keinen Tresor angelegt. Das ist in Ordnung: Bereite das signierte PDF vor und sichere es über „Teilen & In Dateien sichern“ oder richte jetzt einen optionalen, nur auf diesem Gerät verschlüsselten Tresor ein.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button onClick={exportPdf} disabled={exporting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#155e63] px-3 text-sm font-bold text-white disabled:opacity-60 active:scale-[.97]"><Download size={16}/>PDF sichern</button><button onClick={focusVault} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#155e63]/30 bg-white px-3 text-sm font-bold text-[#155e63] active:scale-[.97]"><LockKeyhole size={16}/>Tresor anlegen</button></div></div></div></section>}
          {vaultConfigured && vaultLocked && <section className="mt-4 rounded-2xl border border-[#155e63]/25 bg-[#eaf4ef] p-4" aria-label="Lokalen Tresor entsperren"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 shrink-0 text-[#155e63]" size={20}/><div className="min-w-0 flex-1"><p className="font-bold text-[#183234]">Tresor nur für das sichere Ablegen entsperren</p><p className="mt-1 text-sm leading-5 text-[#506967]">Zum direkten Download musst du ihn nicht entsperren. Für das verschlüsselte Ablegen im Tresor wird dein Passwort benötigt.</p><button onClick={focusVault} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#155e63]/30 bg-white px-3 text-sm font-bold text-[#155e63] active:scale-[.97]"><LockKeyhole size={16}/>Tresor entsperren</button></div></div></section>}
          {vaultConfigured && !vaultLocked && <section className="mt-4 rounded-2xl border border-[#155e63]/25 bg-[#eaf4ef] p-4" aria-label="Signiertes PDF im Tresor sichern"><div className="flex items-start gap-3"><Archive className="mt-0.5 shrink-0 text-[#155e63]" size={20}/><div className="min-w-0 flex-1"><p className="font-bold text-[#183234]">Zusätzlich verschlüsselt im Tresor sichern</p><p className="mt-1 text-sm leading-5 text-[#506967]">Die PDF wird nur auf diesem Gerät verschlüsselt abgelegt. Der direkte Download bleibt weiterhin möglich.</p><button onClick={savePdfToVault} disabled={exporting} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155e63] px-3 text-sm font-bold text-white disabled:opacity-60 active:scale-[.97]"><Archive size={16}/>Im Tresor sichern</button></div></div></section>}
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#a7b9a6]/55 bg-[#a7b9a6]/20 p-4 text-sm leading-6 text-[#375552]"><Info className="mt-0.5 shrink-0 text-[#155e63]" size={18}/><p>Auf dem iPhone lassen sich Unterschriften direkt mit dem Finger setzen. Die Hardware-Anbindung eines Signotec-Pads bleibt bewusst der Windows-Version vorbehalten.</p></div>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20"><section className="paper-card overflow-hidden rounded-[1.5rem] bg-[#fffdf8]"><img src={ILLUSTRATION_IMAGE} alt="Abstrakter Papierweg mit Wegmarken" className="h-32 w-full object-cover"/><div className="p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">Nächster Schritt</p><h1 className="display mt-2 text-3xl leading-none text-[#183234]">Unterschrift an die richtige Stelle.</h1><p className="mt-3 text-sm leading-6 text-[#506967]">{officePadReady ? "Das vorbereitete iPad oder iPhone erhält die Aufforderung direkt. Danach setzt du die Signatur im PDF an die gewünschte Position." : "Zeichne zuerst. Tippe danach im Dokument genau auf die gewünschte Position."}</p><button onClick={requestSignature} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#155e63] px-4 text-sm font-bold text-white shadow-lg shadow-[#155e63]/20 transition hover:bg-[#0d4549] active:scale-[.97]"><PenLine size={18}/>{officePadReady ? "Unterschrift am Büro-Pad anfordern" : pendingSignature ? "Neue Signatur zeichnen" : "Unterschrift zeichnen"}</button></div></section><LocalSignaturePairing ref={localSignaturePairingRef} onSignature={prepareRemoteSignature} onOfficePadReady={setOfficePadReady}/><section className="paper-card rounded-[1.5rem] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-bold text-[#183234]">Wegmarken</h2><span className="rounded-full bg-[#f7f3e9] px-2 py-1 text-xs font-bold text-[#506967]">{signatures.length} gesetzt</span></div><div className="mt-4 space-y-3">{logs.length ? logs.map((entry, index) => <div key={`${entry.time}-${index}`} className="flex gap-3 text-sm"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#a7b9a6]"/><p className="leading-5 text-[#506967]"><span className="mr-2 font-bold text-[#155e63]">{entry.time}</span>{entry.message}</p></div>) : <p className="text-sm leading-6 text-[#506967]">Hier erscheinen die Schritte für dieses Dokument.</p>}</div></section></aside>
</section>
<LocalArchive documents={archivedDocuments} ready={archiveReady} persistent={localPersistence} configured={vaultConfigured} locked={vaultLocked} faceIdAvailable={faceIdAvailable} faceIdEnabled={faceIdEnabled} canUnlockWithFaceId={Boolean(vaultKey)} onSetup={setupVault} onUnlockWithPassword={unlockVaultWithPassword} onUnlockWithFaceId={unlockVaultWithFaceId} onEnableFaceId={activateFaceId} onChangePassword={changeVaultPassword} onExportBackup={exportVaultBackup} onImportBackup={importVaultBackup} onLock={lockVault} onOpen={openArchivedDocument} onDownload={downloadArchivedDocument} onDelete={deleteArchivedDocument}/>
      {dialogOpen && <SignatureDialog personNumber={dialogPersonNumber} signerName={signerNames[dialogPersonNumber]} onSignerNameChange={(value) => setSignerNames((previous) => ({ ...previous, [dialogPersonNumber]: value }))} showDate={dateOptions[dialogPersonNumber].show} onShowDateChange={(value) => setDateOptions((previous) => ({ ...previous, [dialogPersonNumber]: { ...previous[dialogPersonNumber], show: value } }))} dateFormat={dateOptions[dialogPersonNumber].format} onDateFormatChange={(value) => setDateOptions((previous) => ({ ...previous, [dialogPersonNumber]: { ...previous[dialogPersonNumber], format: value } }))} onClose={() => { setDialogOpen(false); setDialogPersonNumber(1); }} onSave={prepareSignature}/>}
</main>
  );
}
