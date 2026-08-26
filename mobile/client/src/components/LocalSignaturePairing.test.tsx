// Tests: Die lokale Kopplung zeigt bei einem Verbindungsfehler einen klaren, erneut ausführbaren Weg an.
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalSignaturePairing, toSignatureImage } from "./LocalSignaturePairing";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

describe("LocalSignaturePairing – Signaturbild", () => {
  it("erhält einen einzelnen Punkt und rastert die Mobil-Signatur dreifach hochaufgelöst", () => {
    const context = {
      setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),
      strokeStyle: "", fillStyle: "", lineWidth: 0, lineCap: "", lineJoin: "", font: "",
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(function (this: HTMLCanvasElement) { return `data:image/png;${this.width}x${this.height}`; });

    const image = toSignatureImage([[[0.5, 0.35]]], "#155e63", {});

    expect(image).toBe("data:image/png;2220x780");
    expect(context.setTransform).toHaveBeenCalledWith(3, 0, 0, 3, 0, 0);
    expect(context.arc).toHaveBeenCalledTimes(1);
    expect(context.fill).toHaveBeenCalledTimes(1);
    expect(context.stroke).not.toHaveBeenCalled();
  });
});
