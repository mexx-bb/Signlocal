export type SignatureDateFormat = "de" | "iso" | "long";

export const SIGNATURE_DATE_FORMATS: { value: SignatureDateFormat; label: string }[] = [
  { value: "de", label: "26.08.2026" },
  { value: "iso", label: "2026-08-26" },
  { value: "long", label: "26. August 2026" },
];

export function formatSignatureDate(value: string, format: SignatureDateFormat = "de") {
  const date = new Date(value);
  if (format === "iso") return date.toISOString().slice(0, 10);
  if (format === "long") return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" }).format(date);
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function signatureCaptionLines(signerName?: string, signedAt?: string, dateFormat: SignatureDateFormat = "de", showDate = true, signedPlace?: string) {
  const lines: string[] = [];
  const normalizedName = signerName?.trim();
  const normalizedPlace = signedPlace?.trim().slice(0, 80);
  if (normalizedName) lines.push(normalizedName.slice(0, 80));
  if (showDate && signedAt) lines.push(normalizedPlace ? `${normalizedPlace}, ${formatSignatureDate(signedAt, dateFormat)}` : formatSignatureDate(signedAt, dateFormat));
  else if (normalizedPlace) lines.push(normalizedPlace);
  return lines;
}
