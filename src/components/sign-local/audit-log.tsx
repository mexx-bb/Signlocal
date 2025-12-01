"use client";
import { useContext } from "react";
import { AppContext } from "@/context/SignAppContext";
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
  isPage?: boolean;
};

export function AuditLog({ isPage = false }: AuditLogProps) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("AuditLog muss innerhalb eines AppProviders verwendet werden");
  }
  const { auditLog: entries } = context;

  const content = (
    <>
      {entries.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <p>Bisher wurden keine Aktionen aufgezeichnet.</p>
        </div>
      ) : (
        <ScrollArea className={isPage ? "h-[calc(100vh-20rem)]" : "h-[450px]"}>
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
    </>
  );

  if (isPage) {
    return (
      <Card>
        <CardContent className="pt-6">
          {content}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-3">
        <History className="w-6 h-6 text-primary" />
        <CardTitle className="font-headline">Audit-Protokoll</CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
