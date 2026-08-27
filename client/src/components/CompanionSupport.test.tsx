import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CompanionSupport } from "./CompanionSupport";

describe("CompanionSupport", () => {
  it("zeigt Anleitung, Zertifikatswarnungs-Hilfe und FAQ erst über klare Aufklappaktionen", async () => {
    const user = userEvent.setup();
    render(<CompanionSupport hotspotImage="/manus-storage/hotspot-visual.png" />);

    expect(screen.queryByAltText("Mac als lokaler Hotspot, verbunden mit iPhone und iPad")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Offline-Hotspot einrichten" }));
    expect(screen.getByAltText("Mac als lokaler Hotspot, verbunden mit iPhone und iPad")).toHaveAttribute("src", "/manus-storage/hotspot-visual.png");
    expect(screen.getByText("Eigenen Hotspot einschalten.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Browser zeigt eine Zertifikatswarnung" }));
    expect(screen.getByText("Nicht auf „Trotzdem fortfahren“ tippen.")).toBeInTheDocument();
    expect(screen.getByText("Auf iPhone/iPad die volle Vertrauensfreigabe für das Zertifikat aktivieren; erst dann die lokale HTTPS-Adresse öffnen.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /FAQ für Außendienstmitarbeitende/ }));
    await user.click(screen.getByRole("button", { name: "Brauche ich im Außendienst Internet?" }));
    expect(screen.getByText(/Nur die erste Installation benötigt Internet/)).toBeInTheDocument();
  });
});
