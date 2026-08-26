import { describe, expect, it } from "vitest";
import { imagePdfName, isSupportedImageFile, normalizeImageRotation } from "./imageToPdf";

describe("lokale Bild-Erkennung", () => {
  it("erkennt PNG, JPEG und HEIC anhand von Endung oder MIME-Typ", () => {
    expect(isSupportedImageFile(new File([""], "scan.png", { type: "image/png" }))).toBe(true);
    expect(isSupportedImageFile(new File([""], "foto.HEIC", { type: "" }))).toBe(true);
    expect(isSupportedImageFile(new File([""], "foto", { type: "image/jpeg" }))).toBe(true);
    expect(isSupportedImageFile(new File([""], "dokument.pdf", { type: "application/pdf" }))).toBe(false);
  });

  it("gibt einer Bild-PDF einen klaren lokalen Namen", () => {
    expect(imagePdfName("Unterschrift.jpeg")).toBe("Unterschrift-konvertiert.pdf");
  });

  it("normalisiert Drehwerte für den lokalen Bildeditor", () => {
    expect(normalizeImageRotation(-90)).toBe(270);
    expect(normalizeImageRotation(450)).toBe(90);
  });
});
