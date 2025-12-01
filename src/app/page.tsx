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
      addAuditLog(`Dokument "${selectedFile.name}" geladen.`);
    } else {
      alert("Bitte laden Sie eine gültige .docx- oder .pdf-Datei hoch.");
    }
  };

  const handleSetSignatureFields = (fields: SignatureField[]) => {
    const oldFields = signatureFields;
    setSignatureFields(fields);

    // Log changes
    if (fields.length > oldFields.length) {
      const newField = fields.find(f => !oldFields.some(of => of.id === f.id));
      if(newField) {
        let logMessage = `Signaturfeld "${newField.name}" an Position (${newField.x.toFixed(1)}%, ${newField.y.toFixed(1)}%) hinzugefügt`;
        if (newField.page) {
          logMessage += ` auf Seite ${newField.page}`;
        }
        logMessage += '.';
        addAuditLog(logMessage);
      }
    } else if (fields.length < oldFields.length) {
      const removedField = oldFields.find(of => !fields.some(f => f.id === of.id));
      if(removedField) addAuditLog(`Signaturfeld "${removedField.name}" entfernt.`);
    } else {
       const changedField = fields.find(f => {
         const oldField = oldFields.find(of => of.id === changedField?.id);
         return oldField && oldField.name !== f.name;
       });
       if(changedField) {
         const oldField = oldFields.find(of => of.id === changedField.id);
         addAuditLog(`Signaturfeld "${oldField?.name}" umbenannt in "${changedField.name}".`);
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
        addAuditLog(`Signatur für Feld "${field.name}" hinzugefügt.`);
    }
  };

  const handleExportPdf = () => {
    setIsProcessing(true);
    addAuditLog("PDF-Exportprozess wird gestartet...");
    setTimeout(() => {
      setIsProcessing(false);
      addAuditLog("PDF erfolgreich erstellt und zum Download bereit.");
      // In a real app, this would trigger a download of the converted PDF
      alert("PDF exportiert (simuliert)");
    }, 2500);
  };
  
  const handlePrint = () => {
    addAuditLog("Dokument wird für den Druck vorbereitet...");
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
        <Header className="no-print" />
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
