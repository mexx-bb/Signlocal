// Tests: Fehlerhafte Backups dürfen nicht importiert werden und der UI-Text muss klar bestätigen, dass der bestehende Tresor unverändert bleibt.
import { describe, expect, it } from "vitest";
import { INVALID_BACKUP_MESSAGE, getBackupIntegrityMessage, getBackupRestoreMessage } from "./backupRestoreMessage";
import { importEncryptedVaultBackup } from "./localArchive";

async function invalidBackup(contents: string) {
  return importEncryptedVaultBackup(new Blob([contents], { type: "application/vnd.signlocal.vault-backup+json" }));
}

describe("beschädigte Tresor-Backups", () => {
  it("lehnt eine unlesbare JSON-Datei vor jedem Datenbankzugriff ab", async () => {
    await expect(invalidBackup("dies ist keine Backup-Datei")).rejects.toThrow("Backup-Datei konnte nicht gelesen werden");
  });

  it("lehnt eine fremde oder unvollständige Backup-Struktur ab", async () => {
    await expect(invalidBackup(JSON.stringify({ format: "fremdes-backup", version: 1 }))).rejects.toThrow("Backup-Format wird nicht unterstützt");
  });

  it("lehnt beschädigte verschlüsselte Daten vor dem Überschreiben des Tresors ab", async () => {
    const damaged = JSON.stringify({
      format: "signlocal-encrypted-vault-backup",
      version: 1,
      exportedAt: "2026-08-25T00:00:00.000Z",
      vault: { version: 1, salt: "!defekt!", verifier: "!defekt!", verifierIv: "!defekt!" },
      documents: [],
    });
    await expect(invalidBackup(damaged)).rejects.toThrow("verschlüsselten Daten im Backup sind beschädigt");
  });

  it("formuliert beschädigte Backup-Fehler ohne technische Details und mit Erhalt des bestehenden Tresors", () => {
    expect(getBackupRestoreMessage(new Error("Die verschlüsselten Daten im Backup sind beschädigt."))).toBe(INVALID_BACKUP_MESSAGE);
    expect(INVALID_BACKUP_MESSAGE).toContain("Dein aktueller Tresor wurde nicht verändert");
  });

  it("bestätigt nach erfolgreicher Wiederherstellung nur die geprüfte Struktur und den verschlüsselten Status", () => {
    expect(getBackupIntegrityMessage(1)).toContain("1 verschlüsseltes Dokument");
    expect(getBackupIntegrityMessage(3)).toContain("3 verschlüsselte Dokumente");
    expect(getBackupIntegrityMessage(3)).toContain("bis zum Entsperren verschlüsselt");
  });

  it("fordert für ein unterstütztes Backup einen vorhandenen Exportzeitpunkt", async () => {
    await expect(invalidBackup(JSON.stringify({ format: "signlocal-encrypted-vault-backup", version: 1, vault: {}, documents: [] }))).rejects.toThrow("Backup-Format wird nicht unterstützt");
  });

  it("lehnt einen unlesbaren Exportzeitpunkt vor dem Datenbankzugriff ab", async () => {
    await expect(invalidBackup(JSON.stringify({ format: "signlocal-encrypted-vault-backup", version: 1, exportedAt: "kein-datum", vault: {}, documents: [] }))).rejects.toThrow("Backup-Format wird nicht unterstützt");
  });
});
