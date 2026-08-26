import { describe, expect, it, vi } from "vitest";
import { sharePdfWithDevice } from "./pdfShare";

describe("sharePdfWithDevice", () => {
  const pdf = new Blob(["PDF"], { type: "application/pdf" });

  it("fordert die native Teilen-Auswahl mit einer PDF-Datei an", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    await expect(sharePdfWithDevice(pdf, "vertrag-signiert.pdf", { share, canShare } as Navigator)).resolves.toBe("shared");
    expect(canShare).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] }));
  });

  it("liefert einen sichtbaren Fallback, wenn keine Dateifreigabe möglich ist", async () => {
    await expect(sharePdfWithDevice(pdf, "vertrag-signiert.pdf", { share: vi.fn(), canShare: vi.fn().mockReturnValue(false) } as Navigator)).resolves.toBe("unavailable");
  });

  it("behandelt das bewusste Schließen der Teilen-Auswahl getrennt", async () => {
    const abort = new DOMException("Abgebrochen", "AbortError");
    await expect(sharePdfWithDevice(pdf, "vertrag-signiert.pdf", { share: vi.fn().mockRejectedValue(abort), canShare: vi.fn().mockReturnValue(true) } as Navigator)).resolves.toBe("cancelled");
  });
});
