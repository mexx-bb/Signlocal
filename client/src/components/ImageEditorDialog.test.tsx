import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageEditorDialog } from "./ImageEditorDialog";

const { createEditedImageFile } = vi.hoisted(() => ({ createEditedImageFile: vi.fn() }));

vi.mock("@/lib/imageToPdf", () => ({ createEditedImageFile }));
vi.mock("react-easy-crop", () => ({
  default: ({ onCropComplete, rotation, zoom, aspect }: { onCropComplete: (area: unknown, pixels: { x: number; y: number; width: number; height: number }) => void; rotation: number; zoom: number; aspect?: number }) => <><output data-testid="cropper-status">{rotation}:{zoom}:{aspect ?? "frei"}</output><button onClick={() => onCropComplete({}, { x: 10, y: 20, width: 300, height: 400 })}>Ausschnitt festlegen</button></>,
}));

describe("ImageEditorDialog", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() });
    createEditedImageFile.mockReset();
  });

  it("übergibt einen lokalen Zuschnitt erst nach ausdrücklicher Bestätigung", async () => {
    const user = userEvent.setup();
    const edited = new File(["bild"], "bild-bearbeitet.jpg", { type: "image/jpeg" });
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    createEditedImageFile.mockResolvedValue(edited);
    render(<ImageEditorDialog file={new File(["bild"], "bild.jpg", { type: "image/jpeg" })} originalName="bild.jpg" onCancel={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.getByRole("button", { name: "PDF vorbereiten" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Ausschnitt festlegen" }));
    await user.click(screen.getByRole("button", { name: "PDF vorbereiten" }));

    expect(createEditedImageFile).toHaveBeenCalledWith(expect.any(File), { x: 10, y: 20, width: 300, height: 400 }, 0, "bild.jpg", expect.any(Function));
    expect(onConfirm).toHaveBeenCalledWith(edited, expect.any(Function), expect.any(Function));
  });

  it("nimmt eine versehentliche Drehung als einzelnen Schritt zurück", async () => {
    const user = userEvent.setup();
    render(<ImageEditorDialog file={new File(["bild"], "bild.jpg", { type: "image/jpeg" })} originalName="bild.jpg" onCancel={vi.fn()} onConfirm={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nach rechts drehen" }));
    expect(screen.getByTestId("cropper-status")).toHaveTextContent("90:1:frei");
    await user.click(screen.getByRole("button", { name: "Letzte Änderung rückgängig machen" }));

    expect(screen.getByTestId("cropper-status")).toHaveTextContent("0:1:frei");
    expect(screen.getByRole("button", { name: "Letzte Änderung rückgängig machen" })).toBeDisabled();
  });

  it("setzt alle Bearbeitungen zurück und kann den Reset selbst wieder zurücknehmen", async () => {
    const user = userEvent.setup();
    render(<ImageEditorDialog file={new File(["bild"], "bild.jpg", { type: "image/jpeg" })} originalName="bild.jpg" onCancel={vi.fn()} onConfirm={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nach rechts drehen" }));
    await user.click(screen.getByRole("button", { name: "Alles zurücksetzen" }));
    expect(screen.getByTestId("cropper-status")).toHaveTextContent("0:1:frei");
    await user.click(screen.getByRole("button", { name: "Letzte Änderung rückgängig machen" }));

    expect(screen.getByTestId("cropper-status")).toHaveTextContent("90:1:frei");
  });

  it("wendet eine vordefinierte Zuschnittform an und nimmt sie wieder zurück", async () => {
    const user = userEvent.setup();
    render(<ImageEditorDialog file={new File(["bild"], "bild.jpg", { type: "image/jpeg" })} originalName="bild.jpg" onCancel={vi.fn()} onConfirm={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "16:9" }));
    expect(screen.getByRole("button", { name: "16:9" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("cropper-status")).toHaveTextContent("0:1:1.7777777777777777");
    await user.click(screen.getByRole("button", { name: "Letzte Änderung rückgängig machen" }));

    expect(screen.getByRole("button", { name: "Frei" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("cropper-status")).toHaveTextContent("0:1:frei");
  });

  it("zeigt beim lokalen Vorbereiten einen verständlichen Fortschrittsbalken", async () => {
    const user = userEvent.setup();
    const edited = new File(["bild"], "bild-bearbeitet.jpg", { type: "image/jpeg" });
    let finishEdit: (() => void) | undefined;
    createEditedImageFile.mockImplementation(() => new Promise<File>((resolve) => { finishEdit = () => resolve(edited); }));
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ImageEditorDialog file={new File(["bild"], "bild.jpg", { type: "image/jpeg" })} originalName="bild.jpg" onCancel={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Ausschnitt festlegen" }));
    await user.click(screen.getByRole("button", { name: "PDF vorbereiten" }));
    expect(screen.getByRole("progressbar", { name: "Lokale Bild-PDF-Vorbereitung" })).toHaveAttribute("aria-valuenow", "4");
    expect(screen.getByText("Bildbearbeitung wird vorbereitet …")).toBeInTheDocument();

    finishEdit?.();
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(edited, expect.any(Function), expect.any(Function)));
  });

  it("bestätigt die fertige lokale PDF-Kopie kurz vor dem Schließen", async () => {
    const user = userEvent.setup();
    const edited = new File(["bild"], "bild-bearbeitet.jpg", { type: "image/jpeg" });
    createEditedImageFile.mockResolvedValue(edited);
    render(<ImageEditorDialog file={new File(["bild"], "bild.jpg", { type: "image/jpeg" })} originalName="bild.jpg" onCancel={vi.fn()} onConfirm={vi.fn().mockResolvedValue(undefined)} />);

    await user.click(screen.getByRole("button", { name: "Ausschnitt festlegen" }));
    await user.click(screen.getByRole("button", { name: "PDF vorbereiten" }));

    expect(await screen.findByText("PDF-Kopie bereit")).toBeInTheDocument();
    expect(screen.getByText("Die Vorschau öffnet sich jetzt.")).toBeInTheDocument();
  });

  it("fordert eine Bestätigung an und bricht erst danach ohne PDF-Übernahme ab", async () => {
    const user = userEvent.setup();
    const edited = new File(["bild"], "bild-bearbeitet.jpg", { type: "image/jpeg" });
    let finishEdit: (() => void) | undefined;
    createEditedImageFile.mockImplementation(() => new Promise<File>((resolve) => { finishEdit = () => resolve(edited); }));
    const onCancel = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ImageEditorDialog file={new File(["bild"], "bild.jpg", { type: "image/jpeg" })} originalName="bild.jpg" onCancel={onCancel} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Ausschnitt festlegen" }));
    await user.click(screen.getByRole("button", { name: "PDF vorbereiten" }));
    await user.click(screen.getByRole("button", { name: "Bild-PDF-Vorbereitung abbrechen" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Bearbeitung abbrechen?");
    expect(onCancel).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Weiter bearbeiten" }));
    expect(screen.getByRole("progressbar", { name: "Lokale Bild-PDF-Vorbereitung" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bild-PDF-Vorbereitung abbrechen" }));
    await user.click(screen.getByRole("button", { name: "Ja, abbrechen" }));
    finishEdit?.();

    expect(onCancel).toHaveBeenCalledOnce();
    await waitFor(() => expect(onConfirm).not.toHaveBeenCalled());
  });
});
