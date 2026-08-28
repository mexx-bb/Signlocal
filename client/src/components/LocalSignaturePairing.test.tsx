// Tests: Die lokale Kopplung zeigt bei einem Verbindungsfehler einen klaren, erneut ausführbaren Weg an.
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalSignaturePairing, toSignatureImage } from "./LocalSignaturePairing";

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
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
    expect(screen.getByRole("button", { name: "Erneut versuchen" })).toBeVisible();
  });
});

describe("LocalSignaturePairing – Büro-Signaturpad", () => {
  it("bereitet eine lokale Pad-Seite per QR-Code vor und bietet danach die direkte Signaturanforderung an", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "pad-1", token: "local-token", padQrCode: "data:image/png;base64,office-pad", expiresAt: Date.now() + 60_000 }) }));
    const user = userEvent.setup();
    render(<LocalSignaturePairing onSignature={vi.fn()} />);

    await user.type(screen.getByLabelText("Lokale HTTPS-Adresse der Begleit-App"), "https://192.168.1.20:8787");
    await user.click(screen.getByRole("button", { name: "Büro-Signaturpad vorbereiten" }));

    expect(await screen.findByAltText("QR-Code zum Einrichten des lokalen Büro-Signaturpads")).toHaveAttribute("src", "data:image/png;base64,office-pad");
    expect(screen.getByRole("button", { name: "Unterschrift am Büro-Pad anfordern" })).toBeVisible();
  });

  it("zeigt bei einer bereits geöffneten Pad-Bindung keinen neuen Sitzungs-QR-Code", async () => {
    class MockSocket {
      static instances: MockSocket[] = [];
      readyState = WebSocket.OPEN;
      onopen: (() => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() { MockSocket.instances.push(this); queueMicrotask(() => this.onopen?.()); }
      close() { this.onclose?.(); }
      send() {}
    }
    vi.stubGlobal("WebSocket", MockSocket);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "session-pad-1", token: "local-token", verificationCode: "654321", qrCode: "data:image/png;base64,fallback", expiresAt: Date.now() + 60_000, padReady: true }) }));
    const user = userEvent.setup();
    render(<LocalSignaturePairing onSignature={vi.fn()} />);

    await user.type(screen.getByLabelText("Lokale HTTPS-Adresse der Begleit-App"), "https://192.168.1.20:8787");
    await user.click(screen.getByRole("button", { name: "Lokale Sitzung starten" }));

    expect(await screen.findByText("QR-Code nicht nötig")).toBeVisible();
    expect(screen.getByText("Büro-Signaturpad wird angefordert")).toBeVisible();
    expect(screen.getByText("654321")).toBeVisible();
    expect(screen.queryByAltText("QR-Code für die lokale Signaturkopplung")).not.toBeInTheDocument();
  });

  it("hält das vorbereitete Büro-Pad nach dem Mobilabschluss für die nächste direkte Anforderung bereit", async () => {
    class MockSocket {
      static instances: MockSocket[] = [];
      readyState = WebSocket.OPEN;
      onopen: (() => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() { MockSocket.instances.push(this); queueMicrotask(() => this.onopen?.()); }
      close() { this.onclose?.(); }
      send() {}
    }
    vi.stubGlobal("WebSocket", MockSocket);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "pad-1", token: "pad-token", padQrCode: "data:image/png;base64,office-pad", expiresAt: Date.now() + 60_000 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "session-pad-1", token: "session-token", verificationCode: "654321", qrCode: "data:image/png;base64,fallback", expiresAt: Date.now() + 60_000, padReady: true }) }));
    const user = userEvent.setup();
    render(<LocalSignaturePairing onSignature={vi.fn()} />);

    await user.type(screen.getByLabelText("Lokale HTTPS-Adresse der Begleit-App"), "https://192.168.1.20:8787");
    await user.click(screen.getByRole("button", { name: "Büro-Signaturpad vorbereiten" }));
    await user.click(screen.getByRole("button", { name: "Unterschrift am Büro-Pad anfordern" }));
    await screen.findByText("Büro-Signaturpad wird angefordert");
    MockSocket.instances[0].onmessage?.({ data: JSON.stringify({ type: "mobile-finished", officePadReady: true }) } as MessageEvent);

    expect(await screen.findByRole("button", { name: "Unterschrift am Büro-Pad anfordern" })).toBeVisible();
    expect(screen.queryByAltText("QR-Code für die lokale Signaturkopplung")).not.toBeInTheDocument();
  });

  it("blendet die vollständige Pairing-Fläche nach einer bestätigten Büro-Pad-Bindung aus und macht die Angaben bei Bedarf wieder zugänglich", async () => {
    class MockSocket {
      static instances: MockSocket[] = [];
      readyState = WebSocket.OPEN;
      onopen: (() => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() { MockSocket.instances.push(this); queueMicrotask(() => this.onopen?.()); }
      close() { this.onclose?.(); }
      send() {}
    }
    vi.stubGlobal("WebSocket", MockSocket);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "session-pad-trusted", token: "local-token", verificationCode: "654321", qrCode: "data:image/png;base64,fallback", expiresAt: Date.now() + 60_000, padReady: true, padTrusted: true }) }));
    const user = userEvent.setup();
    render(<LocalSignaturePairing onSignature={vi.fn()} />);

    await user.type(screen.getByLabelText("Lokale HTTPS-Adresse der Begleit-App"), "https://192.168.1.20:8787");
    await user.click(screen.getByRole("button", { name: "Lokale Sitzung starten" }));
    await screen.findByText("Büro-Pad bestätigt");
    MockSocket.instances[0].onmessage?.({ data: JSON.stringify({ type: "mobile-finished", officePadReady: true, padTrusted: true }) } as MessageEvent);

    expect(await screen.findByText("Vertrautes Mobilgerät ist verbunden.")).toBeVisible();
    expect(screen.queryByLabelText("Lokale HTTPS-Adresse der Begleit-App")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Angaben ändern" }));
    expect(await screen.findByLabelText("Lokale HTTPS-Adresse der Begleit-App")).toBeVisible();
    expect(screen.getByRole("button", { name: "Ausblenden" })).toBeVisible();
  });
});

describe("LocalSignaturePairing – Verbindungsbestätigung", () => {
  it("zeigt nach erfolgreicher iPad-/iPhone-Verbindung eine deutliche Bestätigung mit dem sicheren nächsten Schritt", async () => {
    class MockSocket {
      static instances: MockSocket[] = [];
      readyState = WebSocket.OPEN;
      onopen: (() => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() { MockSocket.instances.push(this); queueMicrotask(() => this.onopen?.()); }
      close() { this.onclose?.(); }
      send() {}
    }
    vi.stubGlobal("WebSocket", MockSocket);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "session-1", token: "local-token", verificationCode: "123456", qrCode: "data:image/png;base64,session", expiresAt: Date.now() + 60_000 }) }));
    const user = userEvent.setup();
    render(<LocalSignaturePairing onSignature={vi.fn()} />);

    await user.type(screen.getByLabelText("Lokale HTTPS-Adresse der Begleit-App"), "https://192.168.1.20:8787");
    await user.click(screen.getByRole("button", { name: "Lokale Sitzung starten" }));
    await screen.findByAltText("QR-Code für die lokale Signaturkopplung");
    MockSocket.instances[0].onmessage?.({ data: JSON.stringify({ type: "paired" }) } as MessageEvent);

    const status = await screen.findByText("iPad, iPhone oder Android verbunden");
    expect(status.closest("[role='status']")).toHaveTextContent("Vergleiche jetzt den sechsstelligen Code auf beiden Geräten.");
    expect(screen.getByRole("button", { name: "Code stimmt überein" })).toBeVisible();
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
