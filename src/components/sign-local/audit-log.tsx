import type { AuditLogEntry } from "@/app/page";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";
import { format } from 'date-fns';

type AuditLogProps = {
  entries: AuditLogEntry[];
};

export function AuditLog({ entries }: AuditLogProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-3">
        <History className="w-6 h-6 text-primary" />
        <CardTitle className="font-headline">Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <p>No actions have been recorded yet.</p>
          </div>
        ) : (
          <ScrollArea className="h-[450px] pr-4">
            <ul className="space-y-4">
              {entries.map((entry, index) => (
                <li key={index} className="flex gap-4 text-sm">
                  <div className="font-mono text-muted-foreground whitespace-nowrap">
                    {format(entry.timestamp, 'HH:mm:ss')}
                  </div>
                  <div className="flex-grow">{entry.message}</div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
