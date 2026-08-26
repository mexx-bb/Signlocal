import { describe, expect, it } from "vitest";
import { docxPdfName, isDocxFile } from "./docxToPdf";

describe("lokale DOCX-Erkennung", () => {
  it("erkennt DOCX-Dateien anhand von Endung oder MIME-Typ", () => {
    expect(isDocxFile(new File([""], "vertrag.DOCX", { type: "" }))).toBe(true);
    expect(isDocxFile(new File([""], "datei", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }))).toBe(true);
    expect(isDocxFile(new File([""], "vertrag.pdf", { type: "application/pdf" }))).toBe(false);
  });

  it("gibt einer konvertierten PDF einen klaren lokalen Namen", () => {
    expect(docxPdfName("Vertrag.docx")).toBe("Vertrag-konvertiert.pdf");
  });
});
