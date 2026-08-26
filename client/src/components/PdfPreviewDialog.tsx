/** Design: „Ruhiger Wegweiser“ — lokale Vorschau mit eindeutiger Rückkehr ohne Zustandsverlust. */
import { ArrowLeft, FileText, X } from "lucide-react";

type Props = { url: string; name: string; onClose: () => void };

export function PdfPreviewDialog({ url, name, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[80] flex bg-[#183234]/55 p-0 backdrop-blur-md sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-label="PDF-Vorschau">
      <section className="flex h-[100svh] w-full flex-col overflow-hidden bg-[#fffdf8] shadow-2xl sm:h-[min(92svh,920px)] sm:max-w-4xl sm:rounded-[1.9rem]">
        <header className="flex items-center justify-between gap-3 border-b border-[#d8d3c9] bg-[#fffdf8] px-4 py-3 sm:px-5"><div className="flex min-w-0 items-center gap-2"><FileText className="shrink-0 text-[#155e63]" size={20}/><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.13em] text-[#155e63]">Lokale Vorschau</p><p className="truncate text-sm font-bold text-[#183234]">{name}</p></div></div><button onClick={onClose} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#155e63] px-3 text-sm font-bold text-white shadow-sm transition active:scale-[.97]" aria-label="Zurück zum Dokument"><ArrowLeft size={17}/><span className="hidden sm:inline">Zurück</span></button></header>
        <iframe title={`Vorschau von ${name}`} src={url} className="min-h-0 flex-1 bg-[#506967]/10" />
        <footer className="flex items-center justify-between gap-3 border-t border-[#d8d3c9] bg-[#fffdf8] px-4 py-3 text-xs leading-5 text-[#506967]"><p>Die Vorschau ist lokal. Mit „Zurück“ bleiben alle bereits gesetzten Unterschriften erhalten.</p><button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d8d3c9] bg-white text-[#155e63] active:scale-[.97]" aria-label="PDF-Vorschau schließen"><X size={18}/></button></footer>
      </section>
    </div>
  );
}
