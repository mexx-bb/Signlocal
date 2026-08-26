// Tests: Der Gerätewechsel bleibt eine klare, sichere iPhone-Wegstrecke von Export bis Import.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeviceTransferGuide } from "./DeviceTransferGuide";

function renderGuide() {
  const onClose = vi.fn();
  const onExport = vi.fn();
  const onSelectImport = vi.fn();
  const onDropImport = vi.fn();
  const user = userEvent.setup();
  render(<DeviceTransferGuide onClose={onClose} onExport={onExport} onSelectImport={onSelectImport} onDropImport={onDropImport} selectedFileName={null} exporting={false} exported={false} busy={false} />);
  return { onClose, onExport, onSelectImport, onDropImport, user };
}

afterEach(cleanup);

describe("DeviceTransferGuide", () => {
  it("führt auf dem alten iPhone durch den verschlüsselten Export und die sichere Übertragung", async () => {
    const { onExport, user } = renderGuide();

    expect(screen.getByRole("heading", { name: "Deinen Tresor mitnehmen" })).toBeInTheDocument();
    expect(screen.getByText(/keine Klartext-PDFs und kein Passwort/i)).toBeInTheDocument();
    expect(screen.getByText(/teile dein Tresor-Passwort niemals mit der Backup-Datei/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Backup jetzt exportieren" }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("wechselt zum neuen iPhone und löst die lokale Auswahl der Backup-Datei aus", async () => {
    const { onSelectImport, user } = renderGuide();

    await user.click(screen.getByRole("button", { name: "Neues iPhone" }));
    expect(screen.getByText(/Signlocal auf dem neuen iPhone öffnen/i)).toBeInTheDocument();
    expect(screen.getByText(/Mit dem bisherigen Passwort entsperren/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Backup-Datei auswählen" }));
    expect(onSelectImport).toHaveBeenCalledTimes(1);
  });

  it("kennzeichnet einen erfolgreichen Export sichtbar für den folgenden Übertragungsschritt", () => {
    render(<DeviceTransferGuide onClose={vi.fn()} onExport={vi.fn()} onSelectImport={vi.fn()} onDropImport={vi.fn()} selectedFileName={null} exporting={false} exported busy={false} />);

    expect(screen.getByLabelText("Backup exportiert")).toBeInTheDocument();
  });

  it("kann ohne Nebenwirkung geschlossen werden", async () => {
    const { onClose, user } = renderGuide();

    await user.click(screen.getByRole("button", { name: "Schließen" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("nimmt eine abgelegte Backup-Datei entgegen und zeigt die nächste Wiederherstellungsaktion an", async () => {
    const { onDropImport, user } = renderGuide();
    await user.click(screen.getByRole("button", { name: "Neues iPhone" }));
    const backup = new File(["verschlüsselt"], "signlocal-tresor.signlocal-backup", { type: "application/vnd.signlocal.vault-backup+json" });

    fireEvent.dragOver(screen.getByRole("region", { name: "Backup-Datei hier ablegen" }), { dataTransfer: { files: [backup] } });
    expect(screen.getByText("Datei jetzt ablegen")).toBeInTheDocument();
    fireEvent.drop(screen.getByRole("region", { name: "Backup-Datei hier ablegen" }), { dataTransfer: { files: [backup] } });

    expect(onDropImport).toHaveBeenCalledWith(backup);
  });
});
