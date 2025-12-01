import { Rocket } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Rocket className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-headline text-foreground">
              SignLocal
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
