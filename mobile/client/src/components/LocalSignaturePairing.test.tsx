// Tests: Die lokale Kopplung zeigt bei einem Verbindungsfehler einen klaren, erneut ausführbaren Weg an.
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalSignaturePairing } from "./LocalSignaturePairing";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LocalSignaturePairing – Verbindungsfehler", () => {
  it("zeigt bei einer nicht erreichbaren lokalen Begleit-App eine verständliche Meldung mit Neuversuch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Netzwerk nicht erreichbar")));
    const user = userEvent.setup();
    render(<LocalSignaturePairing onSignature={vi.fn()} />);

    await user.type(screen.getByLabelText("Lokale HTTPS-Adresse der Begleit-App"), "https://192.168.1.20:8787");
    await user.click(screen.getByRole("button", { name: "Lokale Sitzung starten" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Netzwerk nicht erreichbar");
    expect(screen.getByRole("button", { name: "Erneut verbinden" })).toBeVisible();
  });
});
