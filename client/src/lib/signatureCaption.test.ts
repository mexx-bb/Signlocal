import { describe, expect, it } from "vitest";
import { formatSignatureDate, signatureCaptionLines } from "./signatureCaption";

describe("signatureCaption", () => {
  it("formatiert das lokale Platzierungsdatum verständlich für die PDF", () => {
    expect(formatSignatureDate(new Date(2026, 7, 26).toISOString())).toBe("26.08.2026");
    expect(formatSignatureDate(new Date(2026, 7, 26).toISOString(), "iso")).toBe("2026-08-26");
    expect(formatSignatureDate(new Date(2026, 7, 26).toISOString(), "long")).toBe("26. August 2026");
  });

  it("erstellt Beschriftungszeilen aus optionalem Namen und Datum", () => {
    expect(signatureCaptionLines("  Erika Muster  ", new Date(2026, 7, 26).toISOString())).toEqual(["Erika Muster", "26.08.2026"]);
    expect(signatureCaptionLines(undefined, new Date(2026, 7, 26).toISOString())).toEqual(["26.08.2026"]);
    expect(signatureCaptionLines("Erika Muster", new Date(2026, 7, 26).toISOString(), "iso", false)).toEqual(["Erika Muster"]);
    expect(signatureCaptionLines("Erika Muster", new Date(2026, 7, 26).toISOString(), "de", true, "Münster")).toEqual(["Erika Muster", "Münster, 26.08.2026"]);
  });
});
