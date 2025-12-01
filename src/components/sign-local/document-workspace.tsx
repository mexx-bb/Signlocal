"use client";

import { useContext } from "react";
import { AppContext } from "@/context/SignAppContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FileText, Loader2, Printer, Save, Undo2, Users, PlusCircle } from "lucide-react";
import { SignatureFieldList } from "./signature-field-list";
import { DocumentPreview } from "./document-preview";
import { cn } from "@/lib/utils";

export function DocumentWorkspace() {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error("DocumentWorkspace must be used within an AppProvider");
  }

  const {
    file,
    signatureFields,
    handleReset,
    handleExportPdf,
    handlePrint,
    isProcessing,
    isPlacing,
    setIsPlacing,
  } = context;
  
  if(!file) return null;

  const allSigned = signatureFields.length > 0 && signatureFields.every((field) => field.signature !== null);

  const handleAddSignatureClick = () => {
    setIsPlacing(true);
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <CardTitle className="font-headline text-xl">{file.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
             <Button variant={isPlacing ? "secondary" : "outline"} onClick={handleAddSignatureClick} className={cn(isPlacing && "ring-2 ring-accent")}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Signature Field
            </Button>
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline">
                        <Users className="mr-2 h-4 w-4" />
                        Manage Signers ({signatureFields.length})
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
                    <SheetHeader>
                        <SheetTitle className="font-headline">Manage Signature Fields</SheetTitle>
                    </SheetHeader>
                    <SignatureFieldList />
                </SheetContent>
            </Sheet>
            
            <Button
              onClick={handleExportPdf}
              disabled={!allSigned || isProcessing}
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
              onClick={handlePrint}
              disabled={!allSigned}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
             <Button variant="ghost" size="icon" onClick={handleReset}>
              <Undo2 className="w-5 h-5" />
              <span className="sr-only">Load another document</span>
            </Button>
          </div>
        </CardHeader>
      </Card>
      
      <DocumentPreview />
      
    </div>
  );
}
