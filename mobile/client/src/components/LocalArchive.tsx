/** Design: „Ruhiger Wegweiser“ — ein privater, verschlüsselter Tresor mit klarer Gerätesperre. */
// Design: Ruhige, vertrauenswürdige Tresoroberfläche mit klaren Fortschrittsstufen und hoher Touch-Lesbarkeit auf dem iPhone.
import { useRef, useState } from "react";
import { AlertTriangle, Archive, CheckCircle2, Download, FileText, Fingerprint, FolderOpen, HardDriveDownload, KeyRound, LockKeyhole, ShieldCheck, Smartphone, Trash2, UnlockKeyhole, Upload } from "lucide-react";
import type { BackupImportReport, LocalSignedDocument, VaultRotationProgress } from "@/lib/localArchive";
import { getBackupIntegrityMessage, getBackupRestoreMessage } from "@/lib/backupRestoreMessage";
import { DeviceTransferGuide } from "@/components/DeviceTransferGuide";

type LocalArchiveProps = {
  documents: LocalSignedDocument[];
  ready: boolean;
  persistent: boolean | null;
  configured: boolean;
  locked: boolean;
  faceIdAvailable: boolean;
  faceIdEnabled: boolean;
  canUnlockWithFaceId: boolean;
  onSetup: (passphrase: string) => Promise<void>;
  onUnlockWithPassword: (passphrase: string) => Promise<void>;
  onUnlockWithFaceId: () => Promise<void>;
  onEnableFaceId: () => Promise<void>;
  onChangePassword: (currentPassphrase: string, nextPassphrase: string, onProgress: (progress: VaultRotationProgress) => void) => Promise<void>;
  onExportBackup: () => Promise<void>;
  onImportBackup: (backup: File) => Promise<BackupImportReport>;
  onLock: () => void;
  onOpen: (document: LocalSignedDocument) => void;
  onDownload: (document: LocalSignedDocument) => void;
  onDelete: (document: LocalSignedDocument) => void;
};

const fieldClass = "mt-2 min-h-11 w-full rounded-xl border border-[#d8d3c9] bg-white px-3 text-[#183234] outline-none focus:border-[#155e63]";

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function LocalArchive(props: LocalArchiveProps) {
  const { documents, ready, persistent, configured, locked, faceIdAvailable, faceIdEnabled, canUnlockWithFaceId, onSetup, onUnlockWithPassword, onUnlockWithFaceId, onEnableFaceId, onChangePassword, onExportBackup, onImportBackup, onLock, onOpen, onDownload, onDelete } = props;
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [nextConfirmation, setNextConfirmation] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<File | null>(null);
  const [restoreReport, setRestoreReport] = useState<BackupImportReport | null>(null);
  const [deviceTransferOpen, setDeviceTransferOpen] = useState(false);
  const [transferExported, setTransferExported] = useState(false);
  const [rotationProgress, setRotationProgress] = useState<VaultRotationProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const backupInputRef = useRef<HTMLInputElement>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Der Vorgang konnte nicht abgeschlossen werden.");
    } finally {
      setBusy(false);
      setRotationProgress(null);
    }
  };

  const setupOrUnlock = () => void run(async () => {
    if (!configured && password !== confirmation) throw new Error("Die beiden Passwörter stimmen nicht überein.");
    if (configured) await onUnlockWithPassword(password);
    else await onSetup(password);
    setPassword("");
    setConfirmation("");
  });

  const changePassword = () => void run(async () => {
    if (nextPassword !== nextConfirmation) throw new Error("Die neuen Passwörter stimmen nicht überein.");
    setRotationProgress({ stage: "preparing", completed: 0, total: 0 });
    await onChangePassword(currentPassword, nextPassword, setRotationProgress);
    setCurrentPassword("");
    setNextPassword("");
    setNextConfirmation("");
    setChangingPassword(false);
    setRotationProgress(null);
  });

  const exportBackup = () => void run(async () => {
    setExportingBackup(true);
    try {
      await onExportBackup();
    } finally {
      setExportingBackup(false);
    }
  });

  const exportBackupForTransfer = () => void run(async () => {
    setExportingBackup(true);
    try {
      await onExportBackup();
      setTransferExported(true);
    } finally {
      setExportingBackup(false);
    }
  });

  const selectBackupForRestore = (file: File) => {
    setBackupToRestore(file);
    setRestoreReport(null);
    setMessage("");
  };

  const restoreBackup = () => void run(async () => {
    if (!backupToRestore) throw new Error("Wähle zuerst eine Signlocal-Backup-Datei aus.");
    setImportingBackup(true);
    try {
      const report = await onImportBackup(backupToRestore);
      setRestoreReport(report);
      setBackupToRestore(null);
      if (backupInputRef.current) backupInputRef.current.value = "";
    } catch (error) {
      throw new Error(getBackupRestoreMessage(error));
    } finally {
      setImportingBackup(false);
    }
  });

  const badge = (
    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${persistent ? "bg-[#a7b9a6]/30 text-[#375552]" : "bg-[#f7f3e9] text-[#506967]"}`}>
      <LockKeyhole size={14} />
      {persistent ? "Verschlüsselt auf diesem Gerät" : "Lokaler Browser-Speicher"}
    </span>
  );

  const error = message && <p className="mt-3 text-sm font-semibold text-[#a4483d]">{message}</p>;
  const storageDeletionWarning = configured && (
    <aside className="mb-5 flex gap-3 rounded-2xl border border-[#c77a45]/35 bg-[#fff3e7] p-4 text-[#694128]" role="alert" aria-label="Warnung vor dem Löschen lokaler Browserdaten">
      <AlertTriangle className="mt-0.5 shrink-0 text-[#a9572a]" size={20} />
      <div>
        <h3 className="text-sm font-extrabold">Bevor du Browserdaten löschst</h3>
        <p className="mt-1 text-sm leading-5">Wenn du in Safari oder deinem Browser die Website-Daten von Signlocal löschst, werden der lokale Tresor und alle darin gespeicherten PDFs dauerhaft entfernt. Lade wichtige Dokumente vorher einzeln aus dem Tresor herunter.</p>
        <p className="mt-2 text-xs leading-5 text-[#805238]">Passwort und Face ID können gelöschte Browserdaten nicht wiederherstellen. Die Löschabfrage von Safari/iOS findet außerhalb der App statt; deshalb bleibt dieser Hinweis hier sichtbar.</p>
      </div>
    </aside>
  );
  const backupRestoreControl = ready && (
    <details open={Boolean(backupToRestore) || Boolean(restoreReport) || undefined} className="mb-5 rounded-2xl border border-[#a7b9a6]/55 bg-[#eef2e9]/45 p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-[#155e63]"><Upload size={17} /> Verschlüsseltes Backup wiederherstellen</summary>
      <p className="mt-3 text-sm leading-5 text-[#506967]">Ein Backup ersetzt den aktuellen lokalen Tresor vollständig. Anschließend brauchst du das Passwort, mit dem das Backup erstellt wurde.</p>
      {restoreReport && <aside className="restore-success-card mt-4 rounded-2xl border border-[#155e63]/25 bg-[#eaf4ef] p-4 text-[#183234]" role="status" aria-live="polite"><div className="flex gap-3"><div className="restore-success-mark grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#155e63] text-white"><CheckCircle2 size={22} /></div><div><p className="font-extrabold">Backup sicher übernommen</p><p className="mt-1 text-sm leading-5 text-[#375552]">{getBackupIntegrityMessage(restoreReport.documentCount)}</p><p className="mt-2 text-xs leading-5 text-[#506967]">Als Nächstes den Tresor mit dem bisherigen Passwort entsperren. Face ID kann danach bei Bedarf erneut eingerichtet werden.</p></div></div><div className="mt-4 rounded-xl border border-[#155e63]/15 bg-white/65 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#155e63]">Lokaler Prüfbericht</p><span className="text-xs font-bold text-[#506967]">Format v{restoreReport.formatVersion}</span></div><dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm"><dt className="font-bold text-[#506967]">Erstellt</dt><dd className="text-right font-semibold text-[#183234]">{formatArchiveDate(restoreReport.exportedAt)}</dd><dt className="font-bold text-[#506967]">Übernommen</dt><dd className="text-right font-semibold text-[#183234]">{restoreReport.documentCount} verschlüsselte Dokument{restoreReport.documentCount === 1 ? "" : "e"}</dd></dl><ul className="mt-4 space-y-2 border-t border-[#155e63]/10 pt-3">{restoreReport.checks.map((check) => <li key={check} className="flex gap-2 text-xs leading-5 text-[#375552]"><CheckCircle2 className="mt-0.5 shrink-0 text-[#155e63]" size={14} />{check}</li>)}</ul><p className="mt-3 text-xs leading-5 text-[#506967]">Dieser Bericht wurde nur auf diesem Gerät erstellt. Er enthält keine PDF-Inhalte, Dateinamen oder Passwörter.</p></div></aside>}
      <input ref={backupInputRef} onChange={(event) => { const file = event.target.files?.[0]; if (file) selectBackupForRestore(file); }} type="file" accept=".signlocal-backup,application/vnd.signlocal.vault-backup+json,application/json" className="hidden" />
      <button onClick={() => backupInputRef.current?.click()} disabled={busy} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#155e63]/30 bg-white px-4 text-sm font-bold text-[#155e63] disabled:opacity-60"><Upload size={17} /> Backup-Datei auswählen</button>
      {backupToRestore && <div className="mt-3 rounded-xl border border-[#c77a45]/35 bg-[#fff3e7] p-3"><p className="text-sm font-bold text-[#694128]">Ausgewählt: {backupToRestore.name}</p><p className="mt-1 text-xs leading-5 text-[#805238]">Mit der Wiederherstellung werden alle aktuell lokalen Tresordaten ersetzt.</p><button onClick={restoreBackup} disabled={busy} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#155e63] px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"><HardDriveDownload size={17} />{importingBackup ? "Backup wird wiederhergestellt …" : "Backup jetzt wiederherstellen"}</button></div>}
      {message && <aside className="mt-3 flex gap-2 rounded-xl border border-[#c77a45]/35 bg-[#fff3e7] p-3 text-[#694128]" role="alert"><AlertTriangle className="mt-0.5 shrink-0 text-[#a9572a]" size={17} /><p className="text-sm font-semibold leading-5">{message}</p></aside>}
    </details>
  );

  return (
    <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8" aria-label="Verschlüsseltes lokales Dokumentarchiv">
      <div className="paper-card overflow-hidden rounded-[1.8rem] bg-[#fffdf8]">
        <div className="flex flex-col gap-4 border-b border-[#d8d3c9]/75 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#155e63]/10 text-[#155e63]"><Archive size={21} /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">Sicher bei dir</p>
              <h2 className="display mt-1 text-2xl text-[#183234]">Mein Platz für wichtige PDFs</h2>
            </div>
          </div>
          {badge}
        </div>

        <div className="p-5 sm:p-7">
          {!ready && <div className="h-28 animate-pulse rounded-2xl bg-[#f7f3e9]" />}

          {ready && storageDeletionWarning}
          {backupRestoreControl}
          {deviceTransferOpen && <DeviceTransferGuide onClose={() => setDeviceTransferOpen(false)} onExport={exportBackupForTransfer} onSelectImport={() => backupInputRef.current?.click()} onDropImport={selectBackupForRestore} selectedFileName={backupToRestore?.name ?? null} exporting={exportingBackup} exported={transferExported} busy={busy} />}

          {ready && !configured && (
            <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
              <div>
                <h3 className="display mt-4 text-3xl leading-none text-[#183234]">Deine signierten PDFs bleiben bei dir.</h3>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#506967]">Richte deinen persönlichen Dokumentplatz ein. Danach werden deine PDFs nur verschlüsselt auf diesem Gerät abgelegt; dein Passwort bleibt ebenfalls hier.</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#a7b9a6]/25 px-3 py-1.5 text-xs font-bold text-[#375552]"><ShieldCheck size={14} /> AES-256-GCM lokal verschlüsselt</div>
                <button onClick={() => setDeviceTransferOpen(true)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-bold text-[#155e63]"><Smartphone size={17} /> Neues iPhone? Gerätewechsel starten</button>
              </div>
              <div className="vault-setup rounded-2xl border border-[#a7b9a6]/60 p-4">
                <label className="block text-sm font-bold text-[#183234]">Neues Tresor-Passwort<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" className={fieldClass} placeholder="Mindestens 12 Zeichen" /></label>
                <label className="mt-3 block text-sm font-bold text-[#183234]">Passwort wiederholen<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} type="password" autoComplete="new-password" className={fieldClass} placeholder="Passwort wiederholen" /></label>
                {error}
                <button onClick={setupOrUnlock} disabled={busy} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#155e63] px-4 text-sm font-bold text-white shadow-lg shadow-[#155e63]/15 disabled:opacity-60"><KeyRound size={17} />{busy ? "Tresor wird eingerichtet …" : "Tresor einrichten"}</button>
              </div>
            </div>
          )}

          {ready && configured && locked && (
            <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
              <div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#155e63]/10 text-[#155e63]"><LockKeyhole size={23} /></div>
                <h3 className="display mt-4 text-3xl leading-none text-[#183234]">Der Dokumenttresor ist gesperrt.</h3>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#506967]">Gib dein Tresor-Passwort ein. Falls Face ID für diese Sitzung aktiviert wurde, kannst du auch die Geräteauthentifizierung verwenden.</p>
              </div>
              <div className="rounded-2xl border border-[#a7b9a6]/60 bg-[#eef2e9]/60 p-4">
                <label className="block text-sm font-bold text-[#183234]">Tresor-Passwort<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" className={fieldClass} placeholder="Passwort eingeben" onKeyDown={(event) => { if (event.key === "Enter") setupOrUnlock(); }} /></label>
                {error}
                <button onClick={setupOrUnlock} disabled={busy} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#155e63] px-4 text-sm font-bold text-white shadow-lg shadow-[#155e63]/15 disabled:opacity-60"><UnlockKeyhole size={17} />{busy ? "Wird entsperrt …" : "Mit Passwort entsperren"}</button>
                {faceIdEnabled && canUnlockWithFaceId && <button onClick={() => void run(onUnlockWithFaceId)} disabled={busy} className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#155e63]/30 bg-white px-4 text-sm font-bold text-[#155e63] disabled:opacity-60"><Fingerprint size={18} />Mit Face ID entsperren</button>}
              </div>
            </div>
          )}

          {ready && configured && !locked && (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-sm leading-6 text-[#506967]">Die PDFs werden verschlüsselt im lokalen Speicher dieses Browsers verwaltet. Ein Download erstellt bewusst eine unverschlüsselte Datei außerhalb des Tresors.</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={onLock} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#155e63]/30 bg-white px-3 text-sm font-bold text-[#155e63]"><LockKeyhole size={17} />Sperren</button>
                  <button onClick={() => { setChangingPassword((visible) => !visible); setMessage(""); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#155e63]/30 bg-white px-3 text-sm font-bold text-[#155e63]"><KeyRound size={17} />Passwort ändern</button>
                  <button onClick={() => setDeviceTransferOpen((visible) => !visible)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#155e63]/30 bg-white px-3 text-sm font-bold text-[#155e63]"><Smartphone size={17} />Gerätewechsel</button>
                  {faceIdAvailable && !faceIdEnabled && <button onClick={() => void run(onEnableFaceId)} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155e63] px-3 text-sm font-bold text-white shadow-sm disabled:opacity-60"><Fingerprint size={17} />Face ID aktivieren</button>}
                </div>
              </div>

              {faceIdEnabled && <p className="mt-3 text-xs leading-5 text-[#6b7d7b]">Face ID schützt die aktive Sitzung. Nach einem vollständigen Browser-Neustart ist zusätzlich das Tresor-Passwort nötig.</p>}

              <section className="mt-5 rounded-2xl border border-[#a7b9a6]/60 bg-white/75 p-4" aria-label="Verschlüsseltes Tresor-Backup">
                <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#155e63]/10 text-[#155e63]"><HardDriveDownload size={20} /></div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">Sicherheitskopie</p><h3 className="mt-1 font-bold text-[#183234]">Verschlüsseltes Tresor-Backup</h3><p className="mt-1 text-sm leading-5 text-[#506967]">Exportiere alle verschlüsselten Dokumente als eine Backup-Datei. Dein Passwort und Face ID werden nicht mitgespeichert; zur späteren Wiederherstellung bleibt dein Tresor-Passwort nötig.</p></div></div>
                <button onClick={exportBackup} disabled={busy} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#155e63]/30 bg-white px-4 text-sm font-bold text-[#155e63] disabled:opacity-60"><HardDriveDownload size={17} />{exportingBackup ? "Verschlüsseltes Backup wird erstellt …" : "Verschlüsseltes Backup exportieren"}</button>
              </section>

              {changingPassword && (
                <div className="mt-5 rounded-2xl border border-[#a7b9a6]/60 bg-[#eef2e9]/60 p-4">
                  <div className="flex items-start gap-3"><KeyRound className="mt-0.5 shrink-0 text-[#155e63]" size={19} /><div><h3 className="font-bold text-[#183234]">Tresor-Passwort ändern</h3><p className="mt-1 text-sm leading-5 text-[#506967]">Alle gespeicherten PDFs werden zuerst entschlüsselt und danach mit einem neuen Schlüssel neu verschlüsselt.</p></div></div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="text-sm font-bold text-[#183234]">Aktuelles Passwort<input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" autoComplete="current-password" className={fieldClass} disabled={busy} /></label>
                    <label className="text-sm font-bold text-[#183234]">Neues Passwort<input value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} type="password" autoComplete="new-password" className={fieldClass} placeholder="Mindestens 12 Zeichen" disabled={busy} /></label>
                    <label className="text-sm font-bold text-[#183234]">Wiederholen<input value={nextConfirmation} onChange={(event) => setNextConfirmation(event.target.value)} type="password" autoComplete="new-password" className={fieldClass} disabled={busy} /></label>
                  </div>
                  {busy && rotationProgress && <div className="mt-4 rounded-xl border border-[#a7b9a6]/60 bg-white/80 p-3" role="status" aria-live="polite"><div className="flex items-center justify-between gap-3 text-xs font-bold text-[#375552]"><span>{rotationProgress.stage === "preparing" ? "Dokumente werden vorbereitet …" : rotationProgress.stage === "processing" ? "Dokumente werden neu verschlüsselt …" : rotationProgress.stage === "saving" ? "Neue Tresoreinstellungen werden gesichert …" : "Neuverschlüsselung abgeschlossen"}</span><span>{rotationProgress.total ? `${Math.round((rotationProgress.completed / rotationProgress.total) * 100)} % · ${rotationProgress.completed} von ${rotationProgress.total}` : "Wird gestartet"}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eef2e9]" role="progressbar" aria-label="Fortschritt der Neuverschlüsselung" aria-valuemin={0} aria-valuemax={rotationProgress.total || 1} aria-valuenow={rotationProgress.completed}><div className="h-full rounded-full bg-[#155e63] transition-[width] duration-200" style={{ width: `${rotationProgress.total ? Math.max(6, Math.round((rotationProgress.completed / rotationProgress.total) * 100)) : 6}%` }} /></div><p className="mt-2 text-xs leading-5 text-[#506967]">Bitte diese Ansicht geöffnet lassen. Die Tresoränderung wird vollständig abgeschlossen.</p></div>}
                  {error}
                  <div className="mt-4 flex justify-end gap-2">{!busy && <button onClick={() => setChangingPassword(false)} className="min-h-11 rounded-xl px-3 text-sm font-bold text-[#155e63]">Abbrechen</button>}<button onClick={changePassword} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155e63] px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"><KeyRound size={16} />{busy ? "Neuverschlüsselung läuft …" : "Passwort sicher ändern"}</button></div>
                </div>
              )}

              <div className="mt-5">
                {documents.length === 0 ? <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#a7b9a6]/70 bg-[#f7f3e9]/70 px-5 py-9 text-center"><FolderOpen className="mb-3 text-[#155e63]" size={27} /><p className="font-bold text-[#183234]">Noch keine Dokumente im Tresor</p><p className="mt-1 max-w-sm text-sm leading-6 text-[#506967]">Nach dem Speichern eines unterschriebenen PDFs erscheint es verschlüsselt hier.</p></div> : <div className="space-y-3">{documents.map((document) => <article key={document.id} className="flex flex-col gap-4 rounded-2xl border border-[#d8d3c9]/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#155e63]/10 text-[#155e63]"><FileText size={20} /></div><div className="min-w-0"><h3 className="truncate font-bold text-[#183234]">{document.name}</h3><p className="mt-1 text-xs text-[#6b7d7b]">{formatArchiveDate(document.createdAt)} · {formatFileSize(document.size)}</p></div></div><div className="flex items-center gap-2"><button onClick={() => onOpen(document)} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#155e63] px-3 text-sm font-bold text-white shadow-sm">Öffnen</button><button onClick={() => onDownload(document)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#d8d3c9] text-[#155e63]" aria-label={`${document.name} herunterladen`}><Download size={17} /></button><button onClick={() => onDelete(document)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#d8d3c9] text-[#8f3d3c]" aria-label={`${document.name} lokal löschen`}><Trash2 size={17} /></button></div></article>)}</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
