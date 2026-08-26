/** Design: „Ruhiger Wegweiser“ — lokale Mehrbild-Reihenfolge mit großen Ziehflächen und Pfeil-Fallback für Touch. */
import { useEffect, useMemo, useState, type DragEvent, type PointerEvent } from "react";
import { Check, ChevronDown, ChevronUp, GripVertical, Loader2, Plus, Trash2, X } from "lucide-react";
import type { ImageProcessingProgress } from "@/lib/imageToPdf";

export type BatchImageItem = { id: string; file: File };

export function moveBatchImage(items: BatchImageItem[], fromId: string, toId: string) {
  const fromIndex = items.findIndex((item) => item.id === fromId);
  const toIndex = items.findIndex((item) => item.id === toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;
  const next = [...items];
  const [moving] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moving);
  return next;
}

type Props = {
  files: File[];
  onCancel: () => void;
  onConfirm: (files: File[], reportProgress: (progress: ImageProcessingProgress) => void) => Promise<void>;
};

export function ImageBatchDialog({ files, onCancel, onConfirm }: Props) {
  const [items, setItems] = useState<BatchImageItem[]>(() => files.map((file) => ({ id: crypto.randomUUID(), file })));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<ImageProcessingProgress>({ value: 0, label: "" });
  const previewUrls = useMemo(() => items.map((item) => ({ id: item.id, url: URL.createObjectURL(item.file) })), [items]);

  useEffect(() => () => previewUrls.forEach((preview) => URL.revokeObjectURL(preview.url)), [previewUrls]);

  const move = (fromId: string, toId: string) => setItems((previous) => moveBatchImage(previous, fromId, toId));
  const startDrag = (event: DragEvent<HTMLElement>, id: string) => {
    setDraggingId(id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  };
  const startPointerDrag = (event: PointerEvent<HTMLButtonElement>, id: string) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggingId(id); };
  const finishPointerDrag = (event: PointerEvent<HTMLButtonElement>) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); stopDrag(); };
  const stopDrag = () => setDraggingId(null);
  const remove = (id: string) => setItems((previous) => previous.filter((item) => item.id !== id));
  const submit = async () => {
    if (items.length < 2) return;
    setSaving(true);
    setProgress({ value: 4, label: "Gemeinsame PDF wird lokal vorbereitet …" });
    try { await onConfirm(items.map((item) => item.file), setProgress); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-[#183234]/45 p-3 backdrop-blur-md sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Bilder anordnen">
      <section className="w-full max-w-lg overflow-hidden rounded-[1.9rem] border border-white/75 bg-[#fffdf8] shadow-2xl shadow-[#183234]/25">
        <header className="flex items-start justify-between gap-4 p-5 pb-3 sm:p-6 sm:pb-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#155e63]">Lokale Bildreihenfolge</p><h2 className="display mt-1 text-3xl text-[#183234]">Bilder anordnen</h2><p className="mt-2 text-sm leading-5 text-[#506967]">Ziehe am Griff, um die Reihenfolge zu ändern. Auf iPhone und iPad funktionieren zusätzlich die Pfeile. Die gemeinsame PDF folgt genau dieser Reihenfolge.</p></div><button onClick={onCancel} disabled={saving} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d8d3c9]/70 bg-white/75 text-[#155e63] shadow-sm transition active:scale-95 disabled:opacity-60" aria-label="Bildreihenfolge schließen"><X size={20}/></button></header>
        <ul className="mx-4 max-h-[45svh] space-y-2 overflow-y-auto pb-2 sm:mx-6" aria-label="Bildreihenfolge">{items.map((item, index) => { const preview = previewUrls.find((entry) => entry.id === item.id); return <li key={item.id} data-image-id={item.id} draggable={!saving} onDragStart={(event) => startDrag(event, item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggingId) move(draggingId, item.id); stopDrag(); }} onDragEnd={stopDrag} className={`flex min-h-16 items-center gap-2 rounded-2xl border bg-white p-2 transition ${draggingId === item.id ? "border-[#155e63] opacity-55" : "border-[#d8d3c9]"}`}><button onPointerDown={(event) => startPointerDrag(event, item.id)} onPointerUp={finishPointerDrag} onPointerCancel={finishPointerDrag} onPointerMove={(event) => { if (!draggingId) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-image-id]"); const targetId = target?.dataset.imageId; if (targetId) move(draggingId, targetId); }} className="grid h-11 w-9 shrink-0 touch-none place-items-center rounded-xl text-[#155e63] active:scale-95" aria-label={`„${item.file.name}“ verschieben`}><GripVertical size={20}/></button><span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#eef2e9]">{preview && <img src={preview.url} alt="" className="h-full w-full object-cover"/>}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#183234]">{item.file.name}</p><p className="mt-0.5 text-xs text-[#6b7d7b]">Seite {index + 1} der gemeinsamen PDF</p></div><div className="flex shrink-0 flex-col"><button onClick={() => index > 0 && move(item.id, items[index - 1].id)} disabled={saving || index === 0} className="grid h-8 w-8 place-items-center rounded-lg text-[#155e63] disabled:opacity-30" aria-label={`„${item.file.name}“ nach oben`}><ChevronUp size={17}/></button><button onClick={() => index < items.length - 1 && move(item.id, items[index + 1].id)} disabled={saving || index === items.length - 1} className="grid h-8 w-8 place-items-center rounded-lg text-[#155e63] disabled:opacity-30" aria-label={`„${item.file.name}“ nach unten`}><ChevronDown size={17}/></button><button onClick={() => remove(item.id)} disabled={saving || items.length === 1} className="mt-1 grid h-8 w-8 place-items-center rounded-lg text-[#a4483d] disabled:opacity-30" aria-label={`„${item.file.name}“ löschen`}><Trash2 size={16}/></button></div></li>; })}</ul>
        <div className="p-5 pt-4 sm:p-6 sm:pt-4">{saving && <div className="mb-3 rounded-xl border border-[#a7b9a6]/55 bg-[#eef2e9]/60 p-3" aria-live="polite"><div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-[#506967]"><span>{progress.label}</span><span>{progress.value}%</span></div><div role="progressbar" aria-label="Gemeinsame Bild-PDF-Vorbereitung" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.value} className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#155e63] transition-[width] duration-200 ease-out" style={{ width: `${progress.value}%` }}/></div></div>}{items.length < 2 && <p role="alert" className="mb-3 rounded-xl border border-[#d8d3c9] bg-[#f7f3e9] p-3 text-xs leading-5 text-[#506967]">Für eine gemeinsame PDF sind mindestens zwei Bilder erforderlich. Schließe diese Liste, um ein einzelnes Bild separat zu bearbeiten.</p>}<button onClick={() => void submit()} disabled={saving || items.length < 2} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#155e63] px-5 text-sm font-bold text-white shadow-lg shadow-[#155e63]/20 transition hover:bg-[#0d4549] disabled:opacity-60 active:scale-[.97]">{saving ? <Loader2 size={17} className="animate-spin"/> : <Check size={17}/>} Gemeinsame PDF vorbereiten</button><p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#6b7d7b]"><Plus size={13}/> Bis zu 20 Bilder bleiben vollständig auf diesem Gerät.</p></div>
      </section>
    </div>
  );
}
