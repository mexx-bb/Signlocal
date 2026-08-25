// Sicherheitstext: Beschädigte Sicherungen dürfen keine technischen Details preisgeben und müssen klar bestätigen, dass der bestehende Tresor unverändert bleibt.
export const INVALID_BACKUP_MESSAGE = "Diese Backup-Datei kann nicht wiederhergestellt werden. Sie ist beschädigt, unvollständig oder nicht mit Signlocal erstellt. Dein aktueller Tresor wurde nicht verändert. Wähle eine andere Backup-Datei.";

export function getBackupRestoreMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : "";
  if (detail.includes("Backup") || detail.includes("verschlüsselten Daten")) return INVALID_BACKUP_MESSAGE;
  return "Die Wiederherstellung konnte nicht abgeschlossen werden. Dein aktueller Tresor wurde nicht verändert. Prüfe die Backup-Datei und versuche es erneut.";
}

export function getBackupIntegrityMessage(documentCount: number) {
  const documents = `${documentCount} verschlüsselte${documentCount === 1 ? "s Dokument" : " Dokumente"}`;
  return `Backup-Struktur geprüft. ${documents} wurden vollständig übernommen und bleiben bis zum Entsperren verschlüsselt.`;
}
