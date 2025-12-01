"use client";

import { useState, type ChangeEvent } from "react";
import { Header } from "@/components/sign-local/header";
import { FileUploader } from "@/components/sign-local/file-uploader";
import { DocumentWorkspace } from "@/components/sign-local/document-workspace";

export type SignatureField = {
  id: string;
  name: string;
  signature: string | null;
};

export type AuditLogEntry = {
  timestamp: Date;
  message: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addAuditLog = (message: string) => {
    setAuditLog((prev) => [{ timestamp: new Date(), message }, ...prev]);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      setFile(selectedFile);
      addAuditLog(`Document "${selectedFile.name}" loaded.`);
      // Mock parsing the document for signature fields
      setSignatureFields([
        { id: "Berater", name: "Berater", signature: null },
        { id: "Kunde", name: "Kunde", signature: null },
      ]);
      addAuditLog(`Found 2 signature fields: Berater, Kunde.`);
    } else {
      // Handle incorrect file type
      alert("Please upload a valid .docx file.");
    }
  };

  const handleReset = () => {
    setFile(null);
    setSignatureFields([]);
    setAuditLog([]);
  };

  const handleAddSignature = (fieldId: string, signatureDataUrl: string) => {
    setSignatureFields((prev) =>
      prev.map((field) =>
        field.id === fieldId ? { ...field, signature: signatureDataUrl } : field
      )
    );
    addAuditLog(`Signature added for field "${fieldId}".`);
  };

  const handleExportPdf = () => {
    setIsProcessing(true);
    addAuditLog("Starting PDF export process...");
    setTimeout(() => {
      setIsProcessing(false);
      addAuditLog("PDF successfully generated and ready for download.");
      // In a real app, this would trigger a download of the converted PDF
      alert("PDF Exported (Simulated)");
    }, 2500);
  };
  
  const handlePrint = () => {
    addAuditLog("Preparing document for printing...");
    alert("Printing... (Simulated)");
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {!file ? (
          <FileUploader onFileChange={handleFileChange} />
        ) : (
          <DocumentWorkspace
            file={file}
            signatureFields={signatureFields}
            auditLog={auditLog}
            onReset={handleReset}
            onAddSignature={handleAddSignature}
            onExportPdf={handleExportPdf}
            onPrint={handlePrint}
            isProcessing={isProcessing}
          />
        )}
      </main>
    </div>
  );
}
