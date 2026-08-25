// Design: Der Gerätewechsel bleibt eine ruhige Wegstrecke mit großen iPhone-Touchzielen, klaren Sicherheitsgrenzen und Wegpetrol als Handlungsfarbe.
import { useState, type DragEvent } from "react";
import { ArrowRight, CheckCircle2, HardDriveDownload, Smartphone, Upload } from "lucide-react";

type DeviceTransferGuideProps = {
  onClose: () => void;
  onExport: () => void;
  onSelectImport: () => void;
  onDropImport: (file: File) => void;
  selectedFileName: string | null;
  exporting: boolean;
  exported: boolean;
  busy: boolean;
};

export function DeviceTransferGuide({ onClose, onExport, onSelectImport, onDropImport, selectedFileName, exporting, exported, busy }: DeviceTransferGuideProps) {
  const [device, setDevice] = useState<"old" | "new">("old");
  const [dragActive, setDragActive] = useState(false);
  const dropBackup = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files[0];
    if (file) onDropImport(file);
  };

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-[#155e63]/25 bg-[#fffdf8]" aria-label="Gerätewechsel-Assistent">
      <div className="flex items-start justify-between gap-3 border-b border-[#d8d3c9]/75 bg-[#155e63]/[.06] p-4">
        <div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#155e63] text-white"><Smartphone size={20} /></div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">Sicherer Gerätewechsel</p><h3 className="mt-1 font-bold text-[#183234]">Deinen Tresor mitnehmen</h3><p className="mt-1 text-sm leading-5 text-[#506967]">Die PDFs bleiben verschlüsselt. Das bisherige Tresor-Passwort brauchst du erst auf dem neuen Gerät wieder.</p></div></div>
        <button onClick={onClose} className="min-h-10 shrink-0 rounded-xl px-3 text-sm font-bold text-[#155e63]">Schließen</button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#f7f3e9] p-1"><button onClick={() => setDevice("old")} className={`min-h-11 rounded-lg px-3 text-sm font-bold ${device === "old" ? "bg-white text-[#155e63] shadow-sm" : "text-[#506967]"}`}>Altes iPhone</button><button onClick={() => setDevice("new")} className={`min-h-11 rounded-lg px-3 text-sm font-bold ${device === "new" ? "bg-white text-[#155e63] shadow-sm" : "text-[#506967]"}`}>Neues iPhone</button></div>
        {device === "old" ? <div className="mt-4 space-y-4"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#155e63] text-xs font-bold text-white">1</span><div><p className="font-bold text-[#183234]">Verschlüsseltes Backup exportieren</p><p className="mt-1 text-sm leading-5 text-[#506967]">Die Backup-Datei enthält keine Klartext-PDFs und kein Passwort.</p><button onClick={onExport} disabled={busy} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#155e63] px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"><HardDriveDownload size={17} />{exporting ? "Backup wird erstellt …" : "Backup jetzt exportieren"}</button></div></div><div className="flex gap-3"><span aria-label={exported ? "Backup exportiert" : "Schritt 2"} className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${exported ? "bg-[#a7b9a6] text-[#183234]" : "border border-[#a7b9a6] text-[#506967]"}`}>{exported ? <CheckCircle2 size={15} /> : "2"}</span><div><p className="font-bold text-[#183234]">Backup-Datei übertragen</p><p className="mt-1 text-sm leading-5 text-[#506967]">Sichere die Datei in „Dateien“ oder übertrage sie zum neuen iPhone, zum Beispiel per AirDrop. Teile dein Tresor-Passwort niemals mit der Backup-Datei.</p></div></div><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#a7b9a6] text-xs font-bold text-[#506967]">3</span><div><p className="font-bold text-[#183234]">Am neuen iPhone fortsetzen</p><button onClick={() => setDevice("new")} className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-bold text-[#155e63]">Zum Import-Schritt <ArrowRight size={16} /></button></div></div></div> : <div className="mt-4 space-y-4"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#155e63] text-xs font-bold text-white">1</span><div><p className="font-bold text-[#183234]">Signlocal auf dem neuen iPhone öffnen</p><p className="mt-1 text-sm leading-5 text-[#506967]">Öffne diese App im Safari-Browser oder über den Homescreen. Der Tresor darf dabei noch leer sein.</p></div></div><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#a7b9a6] text-xs font-bold text-[#506967]">2</span><div><p className="font-bold text-[#183234]">Backup-Datei hinzufügen</p><p className="mt-1 text-sm leading-5 text-[#506967]">Ziehe die übertragene Backup-Datei hierher oder wähle sie aus „Dateien“. Danach erscheint die eindeutige Bestätigung zur Wiederherstellung.</p><div onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={dropBackup} role="region" aria-label="Backup-Datei hier ablegen" className={`mt-3 rounded-xl border-2 border-dashed p-3 text-center transition ${dragActive ? "border-[#155e63] bg-[#155e63]/10" : "border-[#a7b9a6]/70 bg-white/75"}`}><Upload className="mx-auto text-[#155e63]" size={20} /><p className="mt-2 text-sm font-bold text-[#183234]">{dragActive ? "Datei jetzt ablegen" : "Backup hier ablegen"}</p><p className="mt-1 text-xs leading-5 text-[#506967]">Oder wähle die Datei auf deinem iPhone aus.</p><button onClick={onSelectImport} disabled={busy} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#155e63]/30 bg-white px-4 text-sm font-bold text-[#155e63] disabled:opacity-60"><Upload size={17} /> Backup-Datei auswählen</button></div>{selectedFileName && <p className="mt-2 text-sm font-bold text-[#375552]">Bereit: {selectedFileName}. Unten Wiederherstellung bestätigen.</p>}</div></div><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#a7b9a6] text-xs font-bold text-[#506967]">3</span><div><p className="font-bold text-[#183234]">Mit dem bisherigen Passwort entsperren</p><p className="mt-1 text-sm leading-5 text-[#506967]">Nach der Wiederherstellung wird der Tresor gesperrt. Gib dann das bisherige Tresor-Passwort ein und richte Face ID bei Bedarf neu ein.</p></div></div></div>}
      </div>
    </section>
  );
}
