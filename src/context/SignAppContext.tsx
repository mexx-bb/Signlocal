"use client";

import { createContext, type ReactNode } from "react";
import type { SignatureField, AuditLogEntry } from "@/app/page";

type AppContextType = {
    file: File | null;
    signatureFields: SignatureField[];
    auditLog: AuditLogEntry[];
    addAuditLog: (message: string) => void;
    setSignatureFields: (fields: SignatureField[]) => void;
    handleAddSignature: (fieldId: string, signatureDataUrl: string) => void;
    handleReset: () => void;
    isProcessing: boolean;
    handleExportPdf: () => void;
    handlePrint: () => void;
    isPlacing: boolean;
    setIsPlacing: (isPlacing: boolean) => void;
};

export const AppContext = createContext<AppContextType | null>(null);

type AppProviderProps = {
    children: ReactNode;
    value: AppContextType;
}

export function AppProvider({ children, value }: AppProviderProps) {
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
