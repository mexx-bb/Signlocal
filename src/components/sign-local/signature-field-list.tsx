"use client";
import Image from "next/image";
import { useState, useContext } from "react";
import { AppContext } from "@/context/SignAppContext";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { SignaturePad } from "./signature-pad";
import { Badge } from "@/components/ui/badge";
import { EditSignatureFieldsDialog } from "./edit-signature-fields-dialog";
import { PenSquare, CheckCircle2, Edit, Trash2 } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

export function SignatureFieldList() {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("SignatureFieldList must be used within an AppProvider");
  }

  const { signatureFields, handleAddSignature, setSignatureFields, addAuditLog } = context;

  const handleDeleteField = (fieldId: string) => {
    const field = signatureFields.find(f => f.id === fieldId);
    if (field) {
        setSignatureFields(signatureFields.filter(f => f.id !== fieldId));
        addAuditLog(`Signature field "${field.name}" removed.`);
    }
  }

  return (
    <>
      <div className="flex justify-end p-4 border-b">
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit Fields
            </Button>
          </DialogTrigger>
          <EditSignatureFieldsDialog 
            fields={signatureFields} 
            onSave={(newFields) => {
              setSignatureFields(newFields);
              setIsEditDialogOpen(false);
            }} 
          />
        </Dialog>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <CardContent className="p-4">
          {signatureFields.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <p className="mb-2">No signature fields have been placed.</p>
              <p className="text-sm">Click on the document to add a signature field.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {signatureFields.map((field) => (
                <li
                  key={field.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-card gap-4"
                >
                  <div className="flex items-center gap-4">
                    {field.signature ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                    ) : (
                      <PenSquare className="w-6 h-6 text-primary shrink-0" />
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{field.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Requires signature
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {field.signature ? (
                      <div className="flex items-center gap-4">
                        <Image
                            src={field.signature}
                            alt={`Signature for ${field.name}`}
                            width={120}
                            height={60}
                            className="rounded-md bg-muted p-1"
                            data-ai-hint="signature"
                          />
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Signed</Badge>
                      </div>
                    ) : (
                      <Badge variant="outline">Not Signed</Badge>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant={field.signature ? "secondary" : "default"}>
                          {field.signature ? "Change" : "Sign"}
                        </Button>
                      </DialogTrigger>
                      <SignaturePad
                        fieldName={field.name}
                        onSave={(signatureDataUrl) =>
                          handleAddSignature(field.id, signatureDataUrl)
                        }
                      />
                    </Dialog>
                    {!field.signature && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteField(field.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete Field</span>
                        </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </ScrollArea>
    </>
  );
}

    