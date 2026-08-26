import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PdfPreviewDialog } from "./PdfPreviewDialog";

describe("PdfPreviewDialog", () => {
  it("kehrt mit einer expliziten Aktion zum unveränderten Dokument zurück", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PdfPreviewDialog url="blob:lokale-pdf" name="vertrag-signiert.pdf" onClose={onClose} />);

    expect(screen.getByTitle("Vorschau von vertrag-signiert.pdf")).toHaveAttribute("src", "blob:lokale-pdf");
    await user.click(screen.getByRole("button", { name: "Zurück zum Dokument" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
