import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageBatchDialog, moveBatchImage } from "./ImageBatchDialog";

describe("ImageBatchDialog", () => {
  beforeEach(() => vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() }));
  afterEach(() => cleanup());

  it("ordnet die lokale Bildliste per Drag-and-Drop neu", () => {
    render(<ImageBatchDialog files={[new File(["a"], "eins.jpg", { type: "image/jpeg" }), new File(["b"], "zwei.jpg", { type: "image/jpeg" }), new File(["c"], "drei.jpg", { type: "image/jpeg" })]} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    const entries = screen.getAllByRole("listitem");
    fireEvent.dragStart(entries[0]);
    fireEvent.dragOver(entries[2]);
    fireEvent.drop(entries[2]);

    expect(screen.getAllByRole("listitem").map((entry) => entry.textContent)).toEqual([expect.stringContaining("zwei.jpg"), expect.stringContaining("drei.jpg"), expect.stringContaining("eins.jpg")]);
  });

  it("verschiebt eine Bildposition ohne Änderung an den lokalen Dateien", () => {
    const first = { id: "a", file: new File(["a"], "eins.jpg") };
    const second = { id: "b", file: new File(["b"], "zwei.jpg") };
    expect(moveBatchImage([first, second], "b", "a")).toEqual([second, first]);
  });

  it("entfernt ein einzelnes Bild und sperrt die Mehrbild-PDF bei nur einem Restbild", async () => {
    const user = userEvent.setup();
    render(<ImageBatchDialog files={[new File(["a"], "eins.jpg", { type: "image/jpeg" }), new File(["b"], "zwei.jpg", { type: "image/jpeg" })]} onCancel={vi.fn()} onConfirm={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "„zwei.jpg“ löschen" }));

    expect(screen.queryByText("zwei.jpg")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("mindestens zwei Bilder");
    expect(screen.getByRole("button", { name: "Gemeinsame PDF vorbereiten" })).toBeDisabled();
  });
});
