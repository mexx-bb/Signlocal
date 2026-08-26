/** Design: „Ruhiger Wegweiser“ — eine klare Schutzabfrage bewahrt lokale Dokumente und Unterschriften vor versehentlichem Verwerfen. */
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Props = { open: boolean; onKeep: () => void; onDiscard: () => void };

export function DocumentDiscardDialog({ open, onKeep, onDiscard }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onKeep(); }}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-[1.6rem] border-[#d8d3c9] bg-[#fffdf8] p-5">
        <AlertDialogHeader><AlertDialogTitle className="display text-2xl text-[#183234]">Neues Dokument beginnen?</AlertDialogTitle><AlertDialogDescription className="text-sm leading-6 text-[#506967]">Die aktuell geöffnete Datei und alle noch nicht gesicherten Unterschriften werden aus dieser Ansicht entfernt. Deine lokale PDF im Tresor bleibt davon unberührt.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter className="mt-4 grid grid-cols-2 gap-2 sm:flex-row"><AlertDialogCancel onClick={onKeep} className="m-0 min-h-12 rounded-xl border-[#d8d3c9] bg-white text-[#155e63]">Weiter bearbeiten</AlertDialogCancel><AlertDialogAction onClick={onDiscard} className="min-h-12 rounded-xl bg-[#a4483d] text-white hover:bg-[#8e382f]">Ja, neues Dokument</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
