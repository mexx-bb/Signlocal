
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { SignatureField } from '@/app/page';

export async function exportToPdf(file: File, signatureFields: SignatureField[]) {
    if (file.type !== 'application/pdf') {
        // For now, we only support adding signatures to existing PDFs.
        // DOCX to PDF conversion would require a more complex setup.
        alert('Der Export ist derzeit nur für PDF-Dateien implementiert.');
        throw new Error('Nicht-PDF-Export ist nicht implementiert.');
    }

    const existingPdfBytes = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    const pages = pdfDoc.getPages();

    for (const field of signatureFields) {
        if (!field.signature || !field.page) continue;

        const page = pages[field.page - 1];
        if (!page) continue;

        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        let imageBytes;
        if (field.signature.startsWith('data:image/png;base64,')) {
            imageBytes = field.signature.substring('data:image/png;base64,'.length);
        } else if (field.signature.startsWith('data:image/jpeg;base64,')) {
            imageBytes = field.signature.substring('data:image/jpeg;base64,'.length);
        } else {
             // Handle placeholder URLs
            const response = await fetch(field.signature);
            imageBytes = await response.arrayBuffer();
        }

        const signatureImage = await pdfDoc.embedPng(imageBytes);

        // Convert field coordinates from percentage to PDF points
        // The Y coordinate needs to be inverted because PDF origin is bottom-left
        const x = (field.x / 100) * pageWidth;
        const y = pageHeight - ((field.y / 100) * pageHeight);
        
        // Adjust coordinates to be the center of the image
        const centerX = x - field.width / 2;
        const centerY = y - field.height / 2;

        page.drawImage(signatureImage, {
            x: centerX,
            y: centerY,
            width: field.width,
            height: field.height,
        });
    }

    const pdfBytes = await pdfDoc.save();
    
    downloadFile(pdfBytes, `${file.name.replace('.pdf', '')}-signed.pdf`, 'application/pdf');
}


function downloadFile(bytes: Uint8Array, fileName: string, mimeType: string) {
    const blob = new Blob([bytes], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}
