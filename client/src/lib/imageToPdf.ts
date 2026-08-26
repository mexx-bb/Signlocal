/** Lokale Bild-zu-PDF-Konvertierung: PNG/JPEG werden nativ dekodiert, HEIC erst bei Bedarf CSP-kompatibel als JPEG. */
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 30_000_000;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/heic", "image/heif"]);

export type ImageCropArea = { x: number; y: number; width: number; height: number };
export type ImageProcessingProgress = { value: number; label: string };
type ReportImageProgress = (progress: ImageProcessingProgress) => void;

export function isSupportedImageFile(file: File) {
  return IMAGE_TYPES.has(file.type.toLowerCase()) || /\.(png|jpe?g|heic|heif)$/i.test(file.name);
}

export function imagePdfName(fileName: string) {
  return `${fileName.replace(/\.(png|jpe?g|heic|heif)$/i, "") || "bild"}-konvertiert.pdf`;
}

export function imagesPdfName(files: File[]) {
  if (files.length === 1) return imagePdfName(files[0].name);
  const firstName = files[0]?.name.replace(/\.(png|jpe?g|heic|heif)$/i, "") || "bilder";
  return `${firstName}-und-${Math.max(0, files.length - 1)}-weitere-bilder.pdf`;
}

function isHeicFile(file: File) {
  return file.type.toLowerCase() === "image/heic" || file.type.toLowerCase() === "image/heif" || /\.(heic|heif)$/i.test(file.name);
}

export function normalizeImageRotation(rotation: number) {
  return ((rotation % 360) + 360) % 360;
}

function loadImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Das Bild konnte lokal nicht gelesen werden.")); };
    image.src = url;
  });
}

export async function prepareImageForEditing(file: File): Promise<File> {
  if (!isSupportedImageFile(file)) throw new Error("Wähle ein PNG-, JPEG- oder HEIC-Bild aus.");
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) throw new Error("Das Bild darf höchstens 25 MB groß sein.");
  if (!isHeicFile(file)) return file;
  const { heicTo } = await import("heic-to/csp");
  const converted = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
  const blob = converted instanceof Blob ? converted : new Blob([converted], { type: "image/jpeg" });
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
}

export async function createEditedImageFile(file: File, crop: ImageCropArea, rotation: number, originalName = file.name, reportProgress?: ReportImageProgress): Promise<File> {
  reportProgress?.({ value: 10, label: "Bild wird lokal gelesen …" });
  const image = await loadImage(file);
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) throw new Error("Das Bild ist für die lokale PDF-Konvertierung zu groß. Wähle ein Bild mit höchstens 30 Megapixeln.");
  reportProgress?.({ value: 30, label: "Drehung wird vorbereitet …" });
  const angle = normalizeImageRotation(rotation);
  const radians = (angle * Math.PI) / 180;
  const rotatedWidth = Math.abs(Math.cos(radians) * image.naturalWidth) + Math.abs(Math.sin(radians) * image.naturalHeight);
  const rotatedHeight = Math.abs(Math.sin(radians) * image.naturalWidth) + Math.abs(Math.cos(radians) * image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(rotatedWidth);
  canvas.height = Math.round(rotatedHeight);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Das Bild konnte nicht lokal bearbeitet werden.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(radians);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  reportProgress?.({ value: 55, label: "Ausschnitt wird erstellt …" });
  const boundedCrop = {
    x: Math.max(0, Math.min(Math.round(crop.x), canvas.width - 1)),
    y: Math.max(0, Math.min(Math.round(crop.y), canvas.height - 1)),
    width: Math.max(1, Math.min(Math.round(crop.width), canvas.width)),
    height: Math.max(1, Math.min(Math.round(crop.height), canvas.height)),
  };
  boundedCrop.width = Math.min(boundedCrop.width, canvas.width - boundedCrop.x);
  boundedCrop.height = Math.min(boundedCrop.height, canvas.height - boundedCrop.y);
  const cropped = document.createElement("canvas");
  cropped.width = boundedCrop.width;
  cropped.height = boundedCrop.height;
  const croppedContext = cropped.getContext("2d");
  if (!croppedContext) throw new Error("Der Bildzuschnitt konnte nicht vorbereitet werden.");
  croppedContext.drawImage(canvas, boundedCrop.x, boundedCrop.y, boundedCrop.width, boundedCrop.height, 0, 0, boundedCrop.width, boundedCrop.height);
  reportProgress?.({ value: 80, label: "Bearbeitetes Bild wird erstellt …" });
  const output = await new Promise<Blob>((resolve, reject) => cropped.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Das bearbeitete Bild konnte nicht erstellt werden.")), "image/jpeg", 0.92));
  reportProgress?.({ value: 100, label: "Bildbearbeitung abgeschlossen." });
  return new File([output], `${originalName.replace(/\.(png|jpe?g|heic|heif)$/i, "") || "bild"}-bearbeitet.jpg`, { type: "image/jpeg" });
}

export async function convertImageToPdf(file: File, reportProgress?: ReportImageProgress): Promise<File> {
  reportProgress?.({ value: 10, label: "PDF-Vorbereitung wird geladen …" });
  const [source, { jsPDF }] = await Promise.all([prepareImageForEditing(file), import("jspdf")]);
  reportProgress?.({ value: 35, label: "Bild wird in die PDF eingepasst …" });
  const image = await loadImage(source);
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) throw new Error("Das Bild ist für die lokale PDF-Konvertierung zu groß. Wähle ein Bild mit höchstens 30 Megapixeln.");

  const orientation = image.naturalWidth > image.naturalHeight ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const pageRatio = (pageWidth - margin * 2) / (pageHeight - margin * 2);
  const width = imageRatio > pageRatio ? pageWidth - margin * 2 : (pageHeight - margin * 2) * imageRatio;
  const height = imageRatio > pageRatio ? (pageWidth - margin * 2) / imageRatio : pageHeight - margin * 2;
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Das Bild konnte nicht lokal für die PDF vorbereitet werden.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  reportProgress?.({ value: 70, label: "PDF-Seite wird erstellt …" });
  pdf.addImage(canvas, "JPEG", (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, "FAST");
  const output = new File([pdf.output("blob")], imagePdfName(file.name), { type: "application/pdf" });
  reportProgress?.({ value: 100, label: "PDF-Kopie ist bereit." });
  return output;
}

export async function convertImagesToPdf(files: File[], reportProgress?: ReportImageProgress): Promise<File> {
  if (files.length < 2) throw new Error("Wähle mindestens zwei Bilder für eine gemeinsame PDF aus.");
  if (files.length > 20) throw new Error("Für eine gemeinsame PDF sind höchstens 20 Bilder vorgesehen.");
  reportProgress?.({ value: 4, label: "Bild-PDF wird lokal vorbereitet …" });
  const { jsPDF } = await import("jspdf");
  let pdf: InstanceType<typeof jsPDF> | null = null;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const source = await prepareImageForEditing(file);
    const image = await loadImage(source);
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) throw new Error(`„${file.name}“ ist für die lokale PDF-Konvertierung zu groß.`);
    const orientation = image.naturalWidth > image.naturalHeight ? "landscape" : "portrait";
    if (!pdf) pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
    else pdf.addPage("a4", orientation);

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const pageRatio = (pageWidth - margin * 2) / (pageHeight - margin * 2);
    const width = imageRatio > pageRatio ? pageWidth - margin * 2 : (pageHeight - margin * 2) * imageRatio;
    const height = imageRatio > pageRatio ? (pageWidth - margin * 2) / imageRatio : pageHeight - margin * 2;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Ein Bild konnte nicht lokal für die PDF vorbereitet werden.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    pdf.addImage(canvas, "JPEG", (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, "FAST");
    reportProgress?.({ value: Math.round(((index + 1) / files.length) * 96), label: `Bild ${index + 1} von ${files.length} wird in die PDF übernommen …` });
  }

  const output = new File([pdf!.output("blob")], imagesPdfName(files), { type: "application/pdf" });
  reportProgress?.({ value: 100, label: "Gemeinsame PDF-Kopie ist bereit." });
  return output;
}
