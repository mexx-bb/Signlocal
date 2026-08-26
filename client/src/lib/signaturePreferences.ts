import type { SignatureDateFormat } from "./signatureCaption";

export type SignatureDateOptions = { show: boolean; format: SignatureDateFormat };
export type SignaturePreferences = {
  signerNames: Record<1 | 2, string>;
  dateOptions: Record<1 | 2, SignatureDateOptions>;
  signerPlace: string;
};

const STORAGE_KEY = "signlocal.signature-preferences.v1";

export const DEFAULT_SIGNATURE_PREFERENCES: SignaturePreferences = {
  signerNames: { 1: "", 2: "" },
  dateOptions: { 1: { show: true, format: "de" }, 2: { show: true, format: "de" } },
  signerPlace: "",
};

function cleanName(value: unknown) {
  return typeof value === "string" ? value.slice(0, 80) : "";
}

function cleanDateOption(value: unknown): SignatureDateOptions {
  if (!value || typeof value !== "object") return { ...DEFAULT_SIGNATURE_PREFERENCES.dateOptions[1] };
  const option = value as { show?: unknown; format?: unknown };
  return {
    show: typeof option.show === "boolean" ? option.show : true,
    format: option.format === "iso" || option.format === "long" || option.format === "de" ? option.format : "de",
  };
}

export function loadSignaturePreferences(): SignaturePreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SIGNATURE_PREFERENCES);
    const parsed = JSON.parse(raw) as Partial<SignaturePreferences>;
    return {
      signerNames: { 1: cleanName(parsed.signerNames?.[1]), 2: cleanName(parsed.signerNames?.[2]) },
      dateOptions: { 1: cleanDateOption(parsed.dateOptions?.[1]), 2: cleanDateOption(parsed.dateOptions?.[2]) },
      signerPlace: cleanName(parsed.signerPlace),
    };
  } catch {
    return structuredClone(DEFAULT_SIGNATURE_PREFERENCES);
  }
}

export function saveSignaturePreferences(update: Partial<SignaturePreferences>) {
  try {
    const current = loadSignaturePreferences();
    const next: SignaturePreferences = {
      signerNames: update.signerNames ? { 1: cleanName(update.signerNames[1]), 2: cleanName(update.signerNames[2]) } : current.signerNames,
      dateOptions: update.dateOptions ? { 1: cleanDateOption(update.dateOptions[1]), 2: cleanDateOption(update.dateOptions[2]) } : current.dateOptions,
      signerPlace: update.signerPlace === undefined ? current.signerPlace : cleanName(update.signerPlace),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Local storage can be unavailable in restrictive browser modes; signing remains usable without persistence.
  }
}

export function clearSignaturePreferences() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Signing remains usable when restrictive browser settings deny local storage access.
  }
}
