import type { AuditLogEntry, SignatureField } from "@/app/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2, Printer, Save, Undo2 } from "lucide-react";
import { SignatureFieldList } from "./signature-field-list";
import { AuditLog } from "./audit-log";

type DocumentWorkspaceProps = {
  file: File;
  signatureFields: SignatureField[];
  auditLog: AuditLogEntry[];
  onReset: () => void;
  onAddSignature: (fieldId: string, signatureDataUrl: string) => void;
  onExportPdf: () => void;
  onPrint: () => void;
  isProcessing: boolean;
};

export function DocumentWorkspace({
  file,
  signatureFields,
  auditLog,
  onReset,
  onAddSignature,
  onExportPdf,
  onPrint,
  isProcessing,
}: DocumentWorkspaceProps) {
  const allSigned = signatureFields.every((field) => field.signature !== null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              <CardTitle className="font-headline">{file.name}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onReset}>
              <Undo2 className="w-5 h-5" />
              <span className="sr-only">Load another document</span>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please provide signatures for the fields identified below.
            </p>
          </CardContent>
        </Card>

        <SignatureFieldList
          fields={signatureFields}
          onAddSignature={onAddSignature}
        />

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Finalize Document</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={onExportPdf}
              disabled={!allSigned || isProcessing}
              className="w-full sm:w-auto"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isProcessing ? "Processing..." : "Save as PDF"}
            </Button>
            <Button
              variant="outline"
              onClick={onPrint}
              disabled={!allSigned}
              className="w-full sm:w-auto"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <AuditLog entries={auditLog} />
      </div>
    </div>
  );
}
