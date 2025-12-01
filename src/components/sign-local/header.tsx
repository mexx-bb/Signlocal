import Link from "next/link";
import { Rocket, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeaderProps = {
  className?: string;
};

export function Header({ className }: HeaderProps) {
  return (
    <header className={cn("border-b bg-card", className)}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Rocket className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-headline text-foreground">
              SignLocal
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link href="/audit">
                <History className="mr-2 h-4 w-4" />
                Audit-Protokoll
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
