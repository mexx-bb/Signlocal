/** Design: „Ruhiger Wegweiser“ — große Touch-Flächen, klarer lokaler Bearbeitungsschritt vor der PDF-Kopie. */
import { useEffect, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Check, Crop, Loader2, RotateCcw, RotateCw, Undo2, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createEditedImageFile, type ImageProcessingProgress } from "@/lib/imageToPdf";

type Props = {
  file: File;
  originalName: string;
  onCancel: () => void;
  onConfirm: (file: File, reportProgress: (progress: ImageProcessingProgress) => void, isCancelled: () => boolean) => Promise<void>;
  onComplete?: () => void;
};

type AspectPreset = { label: string; value?: number };
type EditState = { crop: Point; zoom: number; rotation: number; aspect?: number };

const ASPECT_PRESETS: AspectPreset[] = [
  { label: "Frei" },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "A4 hoch", value: 210 / 297 },
];
const INITIAL_EDIT_STATE: EditState = { crop: { x: 0, y: 0 }, zoom: 1, rotation: 0, aspect: undefined };
const cloneEditState = (state: EditState): EditState => ({ crop: { ...state.crop }, zoom: state.zoom, rotation: state.rotation, aspect: state.aspect });
const isSameEditState = (left: EditState, right: EditState) => left.crop.x === right.crop.x && left.crop.y === right.crop.y && left.zoom === right.zoom && left.rotation === right.rotation && left.aspect === right.aspect;

export function ImageEditorDialog({ file, originalName, onCancel, onConfirm, onComplete }: Props) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<ImageProcessingProgress>({ value: 0, label: "" });
  const [completed, setCompleted] = useState(false);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  const [history, setHistory] = useState<EditState[]>([]);
  const cropGestureStart = useRef<EditState | null>(null);
  const zoomGestureStart = useRef<EditState | null>(null);
  const processingRun = useRef(0);
  const completionTimer = useRef<number | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => { if (completionTimer.current !== null) window.clearTimeout(completionTimer.current); }, []);

  const getEditState = (): EditState => ({ crop: { ...crop }, zoom, rotation, aspect });
  const restoreEditState = (state: EditState) => {
    setCrop({ ...state.crop });
    setZoom(state.zoom);
    setRotation(state.rotation);
    setAspect(state.aspect);
    setCropArea(null);
  };
  const addUndoStep = (state: EditState) => setHistory((previous) => [...previous.slice(-9), cloneEditState(state)]);
  const finishGesture = (start: EditState | null) => {
    const current = getEditState();
    if (start && !isSameEditState(start, current)) addUndoStep(start);
  };
  const rotate = (degrees: number) => {
    addUndoStep(getEditState());
    setRotation((value) => (value + degrees + 360) % 360);
    setCropArea(null);
  };
  const selectAspect = (nextAspect?: number) => {
    const current = getEditState();
    if (current.aspect === nextAspect) return;
    addUndoStep(current);
    setAspect(nextAspect);
    setCropArea(null);
  };
  const reset = () => {
    const current = getEditState();
    if (isSameEditState(current, INITIAL_EDIT_STATE)) return;
    addUndoStep(current);
    restoreEditState(INITIAL_EDIT_STATE);
  };
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((entries) => entries.slice(0, -1));
    restoreEditState(previous);
  };
  const beginCropGesture = () => { cropGestureStart.current = getEditState(); };
  const endCropGesture = () => { finishGesture(cropGestureStart.current); cropGestureStart.current = null; };
  const beginZoomGesture = () => { zoomGestureStart.current = getEditState(); };
  const endZoomGesture = () => { finishGesture(zoomGestureStart.current); zoomGestureStart.current = null; };
  const cancelProcessing = () => {
    processingRun.current += 1;
    if (completionTimer.current !== null) window.clearTimeout(completionTimer.current);
    setCancelConfirmationOpen(false);
    setSaving(false);
    onCancel();
  };
  const submit = async () => {
    if (!cropArea) return;
    const run = processingRun.current + 1;
    processingRun.current = run;
    const isCurrentRun = () => processingRun.current === run;
    setSaving(true);
    setCompleted(false);
    setProgress({ value: 4, label: "Bildbearbeitung wird vorbereitet …" });
    try {
      const edited = await createEditedImageFile(file, cropArea, rotation, originalName, (update) => { if (isCurrentRun()) setProgress({ value: Math.round(update.value * 0.62), label: update.label }); });
      if (!isCurrentRun()) return;
      setProgress({ value: 65, label: "PDF-Kopie wird lokal erstellt …" });
      await onConfirm(edited, (update) => { if (isCurrentRun()) setProgress(update); }, () => !isCurrentRun());
      if (!isCurrentRun()) return;
      setProgress({ value: 100, label: "PDF-Kopie ist bereit." });
      setCompleted(true);
      completionTimer.current = window.setTimeout(() => { if (isCurrentRun()) onComplete?.(); }, 1_100);
    }
    catch { /* Die aufrufende Seite zeigt den konkreten lokalen Fehler an. */ }
    finally { if (isCurrentRun()) setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-[#183234]/45 p-3 backdrop-blur-md sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Bild bearbeiten">
      <section className="w-full max-w-lg overflow-hidden rounded-[1.9rem] border border-white/75 bg-[#fffdf8] shadow-2xl shadow-[#183234]/25">
        <header className="flex items-start justify-between gap-4 p-5 pb-3 sm:p-6 sm:pb-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#155e63]">Lokale Bildbearbeitung</p><h2 className="display mt-1 text-3xl text-[#183234]">Ausschnitt wählen</h2><p className="mt-2 text-sm leading-5 text-[#506967]">Ziehe das Bild, zoome mit dem Regler und drehe es bei Bedarf. Mit „Rückgängig“ nimmst du den letzten Schritt zurück. Nichts wird hochgeladen.</p></div><button onClick={onCancel} disabled={saving} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d8d3c9]/70 bg-white/75 text-[#155e63] shadow-sm transition active:scale-95" aria-label="Bildbearbeitung schließen"><X size={20}/></button></header>
        <div className="relative mx-4 h-[48svh] min-h-72 overflow-hidden rounded-[1.35rem] bg-[#183234] sm:mx-6"><Cropper image={previewUrl} crop={crop} zoom={zoom} rotation={rotation} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setCropArea(pixels)} onInteractionStart={beginCropGesture} onInteractionEnd={endCropGesture} showGrid={false} objectFit="contain" /></div>
        <div className="p-5 pt-4 sm:p-6 sm:pt-4"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-[#506967]">Seitenverhältnis</p><div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Seitenverhältnis wählen">{ASPECT_PRESETS.map((preset) => <button key={preset.label} onClick={() => selectAspect(preset.value)} disabled={saving} aria-pressed={aspect === preset.value} className={`min-h-11 rounded-xl border px-2 text-xs font-bold transition active:scale-[.97] disabled:opacity-60 ${aspect === preset.value ? "border-[#155e63] bg-[#eef2e9] text-[#155e63] shadow-sm" : "border-[#d8d3c9] bg-white text-[#506967]"}`}>{preset.label}</button>)}</div></div><div className="mt-4 flex items-center justify-between gap-3"><label className="min-w-0 flex-1"><span className="block text-xs font-bold uppercase tracking-[.13em] text-[#506967]">Zoom</span><input aria-label="Bildgröße" type="range" min="1" max="3" step="0.05" value={zoom} onPointerDown={beginZoomGesture} onPointerUp={endZoomGesture} onPointerCancel={endZoomGesture} onKeyDown={(event) => { if (!event.repeat) beginZoomGesture(); }} onKeyUp={endZoomGesture} onChange={(event) => { setZoom(Number(event.target.value)); setCropArea(null); }} className="mt-2 w-full accent-[#155e63]" /></label><div className="flex shrink-0 gap-2"><button onClick={() => rotate(-90)} disabled={saving} className="grid h-11 w-11 place-items-center rounded-xl border border-[#d8d3c9] bg-white text-[#155e63] transition active:scale-[.97] disabled:opacity-60" aria-label="Nach links drehen"><RotateCcw size={19}/></button><button onClick={() => rotate(90)} disabled={saving} className="grid h-11 w-11 place-items-center rounded-xl border border-[#d8d3c9] bg-white text-[#155e63] transition active:scale-[.97] disabled:opacity-60" aria-label="Nach rechts drehen"><RotateCw size={19}/></button></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={undo} disabled={saving || completed || !history.length} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d8d3c9] bg-white px-3 text-sm font-semibold text-[#155e63] transition active:scale-95 disabled:opacity-50" aria-label="Letzte Änderung rückgängig machen"><Undo2 size={17}/> Rückgängig</button><button onClick={reset} disabled={saving || completed || isSameEditState(getEditState(), INITIAL_EDIT_STATE)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d8d3c9] bg-white px-3 text-sm font-semibold text-[#155e63] transition active:scale-95 disabled:opacity-50"><Crop size={17}/> Alles zurücksetzen</button>{saving && <div className="col-span-2 rounded-xl border border-[#a7b9a6]/55 bg-[#eef2e9]/60 p-3" aria-live="polite"><div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-[#506967]"><span>{progress.label}</span><span>{progress.value}%</span></div><div className="flex items-center gap-2"><div role="progressbar" aria-label="Lokale Bild-PDF-Vorbereitung" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.value} className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#155e63] transition-[width] duration-200 ease-out" style={{ width: `${progress.value}%` }}/></div><button onClick={() => setCancelConfirmationOpen(true)} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#d8d3c9] bg-white px-2.5 text-xs font-bold text-[#155e63] transition active:scale-[.97]" aria-label="Bild-PDF-Vorbereitung abbrechen"><X size={15}/> Abbrechen</button></div></div>}{completed && <div role="status" aria-live="polite" className="col-span-2 flex items-center gap-3 rounded-xl border border-[#a7b9a6]/60 bg-[#eef2e9] p-3 text-[#155e63]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow-sm motion-safe:animate-pulse"><Check size={19}/></span><div><p className="text-sm font-bold">PDF-Kopie bereit</p><p className="text-xs leading-5 text-[#506967]">Die Vorschau öffnet sich jetzt.</p></div></div>}<button onClick={() => void submit()} disabled={!cropArea || saving || completed} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#155e63] px-5 text-sm font-bold text-white shadow-lg shadow-[#155e63]/20 transition hover:bg-[#0d4549] disabled:opacity-60 active:scale-[.97]">{saving ? <Loader2 size={17} className="animate-spin"/> : <Check size={17}/>} PDF vorbereiten</button></div>
        </div>
      </section>
      <AlertDialog open={cancelConfirmationOpen} onOpenChange={setCancelConfirmationOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-[1.6rem] border-[#d8d3c9] bg-[#fffdf8] p-5">
          <AlertDialogHeader><AlertDialogTitle className="display text-2xl text-[#183234]">Bearbeitung abbrechen?</AlertDialogTitle><AlertDialogDescription className="text-sm leading-6 text-[#506967]">Der aktuelle lokale Vorgang wird verworfen. Es wird keine PDF-Kopie übernommen.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-4 grid grid-cols-2 gap-2 sm:flex-row"><AlertDialogCancel className="m-0 min-h-12 rounded-xl border-[#d8d3c9] bg-white text-[#155e63]">Weiter bearbeiten</AlertDialogCancel><AlertDialogAction onClick={cancelProcessing} className="min-h-12 rounded-xl bg-[#155e63] text-white hover:bg-[#0d4549]">Ja, abbrechen</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
