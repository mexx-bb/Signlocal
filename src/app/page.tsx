"use client";

import { useState, type ChangeEvent } from "react";
import { usePathname } from 'next/navigation';
import { Header } from "@/components/sign-local/header";
import { FileUploader } from "@/components/sign-local/file-uploader";
import { DocumentWorkspace } from "@/components/sign-local/document-workspace";
import { AppProvider } from "@/context/SignAppContext";
import AuditPage from "./audit/page";


export type SignatureField = {
  id: string;
  name: string;
  signature: string | null;
  x: number; // Position from left in %
  y: number; // Position from top in %
  width: number; // Width in px
  height: number; // Height in px
  page?: number; // Page number for PDFs
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
  const [isPlacing, setIsPlacing] = useState(false);
  const pathname = usePathname();


  const addAuditLog = (message: string) => {
    setAuditLog((prev) => [{ timestamp: new Date(), message }, ...prev]);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    const allowedTypes = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/pdf"];
    if (selectedFile && allowedTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      setSignatureFields([]);
      setAuditLog([]); // Reset log for new document
      addAuditLog(`Document "${selectedFile.name}" loaded.`);
    } else {
      alert("Please upload a valid .docx or .pdf file.");
    }
  };

  const handleSetSignatureFields = (fields: SignatureField[]) => {
    const oldFields = signatureFields;
    setSignatureFields(fields);

    // Log changes
    if (fields.length > oldFields.length) {
      const newField = fields.find(f => !oldFields.some(of => of.id === f.id));
      if(newField) {
        let logMessage = `Signature field "${newField.name}" added at position (${newField.x.toFixed(1)}%, ${newField.y.toFixed(1)}%)`;
        if (newField.page) {
          logMessage += ` on page ${newField.page}`;
        }
        logMessage += '.';
        addAuditLog(logMessage);
      }
    } else if (fields.length < oldFields.length) {
      const removedField = oldFields.find(of => !fields.some(f => f.id === of.id));
      if(removedField) addAuditLog(`Signature field "${removedField.name}" removed.`);
    } else {
       const changedField = fields.find(f => {
         const oldField = oldFields.find(of => of.id === f.id);
         return oldField && oldField.name !== f.name;
       });
       if(changedField) {
         const oldField = oldFields.find(of => of.id === changedField.id);
         addAuditLog(`Signature field "${oldField?.name}" renamed to "${changedField.name}".`);
       }
    }
  };

  const handleReset = () => {
    setFile(null);
    setSignatureFields([]);
    setAuditLog([]);
  };

  const handleAddSignature = (fieldId: string, signatureDataUrl: string) => {
    const field = signatureFields.find(f => f.id === fieldId);
    if(field) {
        setSignatureFields((prev) =>
          prev.map((f) =>
            f.id === fieldId ? { ...f, signature: signatureDataUrl } : f
          )
        );
        addAuditLog(`Signature added for field "${field.name}".`);
    }
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
    // A short timeout to allow the UI to update before printing
    setTimeout(() => {
        window.print();
    }, 100);
  };
  
  const renderContent = () => {
    if (pathname === '/audit') {
      return <AuditPage />;
    }
    
    return (
        <div className="flex flex-col h-full bg-background text-foreground">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
            {!file ? (
            <FileUploader onFileChange={handleFileChange} />
            ) : (
            <DocumentWorkspace />
            )}
        </main>
        </div>
    );
  }

  return (
    <AppProvider value={{ file, signatureFields, auditLog, addAuditLog, setSignatureFields, handleAddSignature, handleReset, isProcessing, handleExportPdf, handlePrint, isPlacing, setIsPlacing }}>
        {renderContent()}
    </AppProvider>
  );
}
