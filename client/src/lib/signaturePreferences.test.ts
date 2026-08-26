import { beforeEach, describe, expect, it } from "vitest";
import { clearSignaturePreferences, DEFAULT_SIGNATURE_PREFERENCES, loadSignaturePreferences, saveSignaturePreferences } from "./signaturePreferences";

describe("lokale Signaturvoreinstellungen", () => {
  beforeEach(() => window.localStorage.clear());

  it("liefert sichere Standardwerte, solange nichts lokal gespeichert ist", () => {
    expect(loadSignaturePreferences()).toEqual(DEFAULT_SIGNATURE_PREFERENCES);
  });

  it("bewahrt Namen, Ort und Datumsoptionen für den nächsten Signaturdialog", () => {
    saveSignaturePreferences({ signerNames: { 1: "Erika Muster", 2: "Max Beispiel" }, dateOptions: { 1: { show: false, format: "iso" }, 2: { show: true, format: "long" } } });
    saveSignaturePreferences({ signerPlace: "Münster" });
    expect(loadSignaturePreferences()).toEqual({ signerNames: { 1: "Erika Muster", 2: "Max Beispiel" }, dateOptions: { 1: { show: false, format: "iso" }, 2: { show: true, format: "long" } }, signerPlace: "Münster" });
  });

  it("entfernt nur die gespeicherten Signaturvorgaben", () => {
    saveSignaturePreferences({ signerNames: { 1: "Erika Muster", 2: "" }, signerPlace: "Münster" });
    clearSignaturePreferences();
    expect(loadSignaturePreferences()).toEqual(DEFAULT_SIGNATURE_PREFERENCES);
  });
});
