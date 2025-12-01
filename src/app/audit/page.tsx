"use client";

import { Header } from "@/components/sign-local/header";
import { AuditLog } from "@/components/sign-local/audit-log";
import { AppProvider } from "@/context/SignAppContext";
import type { AuditLogEntry, SignatureField } from "@/app/page";

export default function AuditPage() {

  // This is a placeholder context for the audit page to render correctly in isolation.
  // In a real app with shared state, this would come from a global provider.
  const mockContext = {
      file: null,
      signatureFields: [] as SignatureField[],
      auditLog: [] as AuditLogEntry[],
      addAuditLog: () => {},
      setSignatureFields: () => {},
      handleAddSignature: () => {},
      handleReset: () => {},
      isProcessing: false,
      handleExportPdf: () => {},
      handlePrint: () => {},
  }

  return (
    <AppProvider value={mockContext}>
        <div className="flex flex-col h-full bg-background text-foreground">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
            <h2 className="text-3xl font-bold font-headline mb-6">Audit Log</h2>
            <p className="text-muted-foreground mb-8">This page shows the complete history of actions taken during the current signing session.</p>
            <AuditLog isPage />
        </main>
        </div>
    </AppProvider>
  );
}
