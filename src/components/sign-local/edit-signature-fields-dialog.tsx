"use client";

import { useState } from "react";
import type { SignatureField } from "@/app/page";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

type EditSignatureFieldsDialogProps = {
  fields: SignatureField[];
  onSave: (fields: SignatureField[]) => void;
};

export function EditSignatureFieldsDialog({
  fields,
  onSave,
}: EditSignatureFieldsDialogProps) {
  const [editableFields, setEditableFields] = useState(fields);

  const handleFieldNameChange = (id: string, newName: string) => {
    setEditableFields(
      editableFields.map((field) =>
        field.id === id ? { ...field, name: newName } : field
      )
    );
  };

  const handleRemoveField = (id: string) => {
    setEditableFields(editableFields.filter((field) => field.id !== id));
  };

  const handleAddField = () => {
    const newId = `field-${Date.now()}`;
    setEditableFields([
      ...editableFields,
      { id: newId, name: `New Field ${editableFields.length + 1}`, signature: null },
    ]);
  };
  
  const handleSaveChanges = () => {
    onSave(editableFields);
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-headline">Edit Signature Fields</DialogTitle>
      </DialogHeader>
      <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {editableFields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <Label htmlFor={`field-name-${index}`} className="sr-only">
                Field Name
            </Label>
            <Input
              id={`field-name-${index}`}
              value={field.name}
              onChange={(e) => handleFieldNameChange(field.id, e.target.value)}
              className="flex-grow"
              disabled={!!field.signature}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveField(field.id)}
              disabled={!!field.signature}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove field</span>
            </Button>
          </div>
        ))}
         {editableFields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No signature fields defined.</p>
        )}
      </div>

      <Button variant="outline" onClick={handleAddField} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add New Field
      </Button>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button onClick={handleSaveChanges}>Save Changes</Button>
      </DialogFooter>
    </DialogContent>
  );
}
