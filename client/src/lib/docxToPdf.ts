/** Lokale DOCX-zu-PDF-Konvertierung: keine Netzwerkübertragung, keine Vorschau des untrusted DOCX-HTMLs im sichtbaren Dokument. */

const MAX_DOCX_BYTES = 20 * 1024 * 1024;
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isDocxFile(file: File) {
  return file.name.toLowerCase().endsWith(".docx") || file.type === DOCX_TYPE;
}

export function docxPdfName(fileName: string) {
  return `${fileName.replace(/\.docx$/i, "") || "word-dokument"}-konvertiert.pdf`;
}

function removeUnsafeNodes(container: HTMLElement) {
  container.querySelectorAll("script, iframe, object, embed, form, audio, video, link").forEach((node) => node.remove());
  container.querySelectorAll<HTMLElement>("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const value = attribute.value.trim().toLowerCase();
      if (attribute.name.startsWith("on") || (attribute.name === "href" && /^(javascript|data):/.test(value)) || (attribute.name === "src" && /^(https?:|javascript:)/.test(value))) node.removeAttribute(attribute.name);
    });
  });
}

export async function convertDocxToPdf(file: File): Promise<File> {
  if (!isDocxFile(file)) throw new Error("Wähle eine Word-Datei im DOCX-Format aus.");
  if (file.size === 0 || file.size > MAX_DOCX_BYTES) throw new Error("Die Word-Datei darf höchstens 20 MB groß sein.");

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-20000px;top:0;width:900px;background:#fff;pointer-events:none;";
  document.body.append(host);

  try {
    const [{ renderAsync }, { default: html2canvas }, { jsPDF }] = await Promise.all([import("docx-preview"), import("html2canvas"), import("jspdf")]);
    await renderAsync(await file.arrayBuffer(), host, host, {
      inWrapper: true,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      renderAltChunks: false,
      renderComments: false,
      renderHeaders: true,
      renderFooters: true,
      useBase64URL: true,
    });
    removeUnsafeNodes(host);
    const pages = Array.from(host.querySelectorAll<HTMLElement>("section.docx"));
    const renderTargets = pages.length ? pages : [host];
    let pdf: InstanceType<typeof jsPDF> | null = null;

    for (const target of renderTargets) {
      const canvas = await html2canvas(target, { backgroundColor: "#ffffff", scale: 2, useCORS: false, logging: false, removeContainer: true });
      if (!canvas.width || !canvas.height) throw new Error("Die Word-Datei enthält keine darstellbare Seite.");
      const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
      if (!pdf) pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
      else pdf.addPage("a4", orientation);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(canvas, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    }
    if (!pdf) throw new Error("Die Word-Datei konnte nicht in eine PDF-Kopie umgewandelt werden.");
    return new File([pdf.output("blob")], docxPdfName(file.name), { type: "application/pdf" });
  } finally {
    host.remove();
  }
}
