import Image from "next/image";
import { useState } from "react";
import type { SignatureField } from "@/app/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { SignaturePad } from "./signature-pad";
import { Badge } from "@/components/ui/badge";
import { EditSignatureFieldsDialog } from "./edit-signature-fields-dialog";
import { PenSquare, CheckCircle2, Edit } from "lucide-react";

type SignatureFieldListProps = {
  fields: SignatureField[];
  onAddSignature: (fieldId: string, signatureDataUrl: string) => void;
  onSetFields: (fields: SignatureField[]) => void;
};

export function SignatureFieldList({
  fields,
  onAddSignature,
  onSetFields,
}: SignatureFieldListProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-headline">Signature Fields</CardTitle>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit Fields
            </Button>
          </DialogTrigger>
          <EditSignatureFieldsDialog 
            fields={fields} 
            onSave={(newFields) => {
              onSetFields(newFields);
              setIsEditDialogOpen(false);
            }} 
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        {fields.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <p>No signature fields have been defined.</p>
            <Button variant="link" onClick={() => setIsEditDialogOpen(true)}>Add signature fields</Button>
          </div>
        ) : (
          <ul className="space-y-4">
            {fields.map((field) => (
              <li
                key={field.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-4 mb-4 sm:mb-0">
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
                <div className="flex items-center gap-4 w-full sm:w-auto">
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
                        {field.signature ? "Change Signature" : "Add Signature"}
                      </Button>
                    </DialogTrigger>
                    <SignaturePad
                      fieldName={field.name}
                      onSave={(signatureDataUrl) =>
                        onAddSignature(field.id, signatureDataUrl)
                      }
                    />
                  </Dialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
