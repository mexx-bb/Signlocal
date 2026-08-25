/** Design: „Ruhiger Wegweiser“ — ein privates, gerätegebundenes Archiv mit klaren lokalen Aktionen. */
import { Archive, Download, FileText, FolderOpen, LockKeyhole, Trash2 } from "lucide-react";
import type { LocalSignedDocument } from "@/lib/localArchive";

type LocalArchiveProps = {
  documents: LocalSignedDocument[];
  ready: boolean;
  persistent: boolean | null;
  onOpen: (document: LocalSignedDocument) => void;
  onDownload: (document: LocalSignedDocument) => void;
  onDelete: (document: LocalSignedDocument) => void;
};

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function LocalArchive({ documents, ready, persistent, onOpen, onDownload, onDelete }: LocalArchiveProps) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8" aria-label="Lokales Dokumentarchiv">
      <div className="paper-card overflow-hidden rounded-[1.8rem] bg-[#fffdf8]">
        <div className="flex flex-col gap-4 border-b border-[#d8d3c9]/75 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#155e63]/10 text-[#155e63]"><Archive size={21}/></div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">Nur auf diesem Gerät</p><h2 className="display mt-1 text-2xl text-[#183234]">Meine signierten Dokumente</h2></div></div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${persistent ? "bg-[#a7b9a6]/30 text-[#375552]" : "bg-[#f7f3e9] text-[#506967]"}`}><LockKeyhole size={14}/>{persistent ? "Gerätespeicher angefragt" : "Lokaler Browser-Speicher"}</span>
        </div>
        <div className="p-5 sm:p-7">
          <p className="max-w-2xl text-sm leading-6 text-[#506967]">Signierte PDFs werden in der lokalen App-Datenbank dieses Browsers abgelegt. Sie werden nicht an Signlocal oder einen anderen Dokumentserver übertragen. Du kannst sie jederzeit herunterladen, erneut öffnen oder hier löschen.</p>
          {!ready ? <div className="mt-5 h-24 animate-pulse rounded-2xl bg-[#f7f3e9]"/> : documents.length === 0 ? <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-[#a7b9a6]/70 bg-[#f7f3e9]/70 px-5 py-9 text-center"><FolderOpen className="mb-3 text-[#155e63]" size={27}/><p className="font-bold text-[#183234]">Noch keine Dokumente im Archiv</p><p className="mt-1 max-w-sm text-sm leading-6 text-[#506967]">Nach dem Speichern eines unterschriebenen PDFs erscheint es automatisch hier.</p></div> : <div className="mt-5 space-y-3">{documents.map((document) => <article key={document.id} className="flex flex-col gap-4 rounded-2xl border border-[#d8d3c9]/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#155e63]/10 text-[#155e63]"><FileText size={20}/></div><div className="min-w-0"><h3 className="truncate font-bold text-[#183234]">{document.name}</h3><p className="mt-1 text-xs text-[#6b7d7b]">{formatArchiveDate(document.createdAt)} · {formatFileSize(document.size)}</p></div></div><div className="flex items-center gap-2"><button onClick={() => onOpen(document)} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#155e63] px-3 text-sm font-bold text-white shadow-sm transition active:scale-[.97]">Öffnen</button><button onClick={() => onDownload(document)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#d8d3c9] text-[#155e63] transition active:scale-[.97]" aria-label={`${document.name} herunterladen`}><Download size={17}/></button><button onClick={() => onDelete(document)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#d8d3c9] text-[#8f3d3c] transition active:scale-[.97]" aria-label={`${document.name} lokal löschen`}><Trash2 size={17}/></button></div></article>)}</div>}
        </div>
      </div>
    </section>
  );
}
