/**
 * Design: „Ruhiger Wegweiser“ — ein warmes, mobiles Produktgefühl mit Wegmarken,
 * großzügiger Lesbarkeit und direkter, sachlicher Bedienung.
 */
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";

export default function App() {
  return (
    <ErrorBoundary>
      <Home />
      <Toaster richColors position="top-center" />
    </ErrorBoundary>
  );
}
