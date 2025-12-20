"use client";

import { useContext } from "react";
import { AppContext } from "@/context/SignAppContext";
import { Header } from "@/components/sign-local/header";
import { AuditLog } from "@/components/sign-local/audit-log";
import { AppProvider } from "@/context/SignAppContext";
import Home from "@/app/page";

export default function AuditPage() {

  // This page is now wrapped in the main app component to access the real context.
  // The content of the page is simply the AuditLog component displayed in a page-like format.
  // This is a bit of a workaround to share state without a more complex state management library.
  
  const appContext = useContext(AppContext);
  
  if(!appContext) {
      // If we're here, it means we are not inside the main `Home` component's provider.
      // We'll render the Home component which will set up its own provider.
      // This is not ideal, but it's a simple way to get the shared state.
      return <Home />
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
    <Header />
    <main className="flex-grow container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold font-headline mb-6">Audit-Protokoll</h2>
        <p className="text-muted-foreground mb-8">Diese Seite zeigt die vollständige Historie der Aktionen, die während der aktuellen Signatursitzung durchgeführt wurden.</p>
        <AuditLog isPage />
    </main>
    </div>
  );
}
