// Tests: Eine erfolgreiche Wiederherstellung endet mit einer klaren, nicht überzeichneten Integritätsbestätigung.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalArchive } from "./LocalArchive";

afterEach(cleanup);

describe("LocalArchive – Wiederherstellungsbestätigung", () => {
  it("zeigt nach einem erfolgreichen Import die geprüfte Struktur und den verschlüsselten Status", async () => {
    const onImportBackup = vi.fn().mockResolvedValue({ formatVersion: 1, exportedAt: "2026-08-25T12:00:00.000Z", documentCount: 2, checks: ["Backup-Datei lokal gelesen", "Tresor atomar in den lokalen Speicher übernommen"] });
    const user = userEvent.setup();
    const { container } = render(<LocalArchive documents={[]} ready persistent configured={false} locked={false} faceIdAvailable={false} faceIdEnabled={false} canUnlockWithFaceId={false} onSetup={vi.fn().mockResolvedValue(undefined)} onUnlockWithPassword={vi.fn().mockResolvedValue(undefined)} onUnlockWithFaceId={vi.fn().mockResolvedValue(undefined)} onEnableFaceId={vi.fn().mockResolvedValue(undefined)} onChangePassword={vi.fn().mockResolvedValue(undefined)} onExportBackup={vi.fn().mockResolvedValue(undefined)} onImportBackup={onImportBackup} onLock={vi.fn()} onOpen={vi.fn()} onDownload={vi.fn()} onDelete={vi.fn()} />);
    const backup = new File(["verschlüsselt"], "signlocal-tresor.signlocal-backup", { type: "application/vnd.signlocal.vault-backup+json" });
    const fileInput = container.querySelector('input[type="file"]');

    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [backup] } });
    await user.click(screen.getByRole("button", { name: "Backup jetzt wiederherstellen" }));

    expect(onImportBackup).toHaveBeenCalledWith(backup);
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Backup sicher übernommen");
    expect(status).toHaveTextContent("2 verschlüsselte Dokumente");
    expect(status).toHaveTextContent("bis zum Entsperren verschlüsselt");
    expect(status).toHaveTextContent("Lokaler Prüfbericht");
    expect(status).toHaveTextContent("Format v1");
    expect(status).toHaveTextContent("Tresor atomar in den lokalen Speicher übernommen");
  });
});
