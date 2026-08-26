import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentDiscardDialog } from "./DocumentDiscardDialog";

describe("DocumentDiscardDialog", () => {
  it("bewahrt das Dokument bei Weiterarbeiten und verwirft es nur nach ausdrücklicher Bestätigung", async () => {
    const user = userEvent.setup();
    const onKeep = vi.fn();
    const onDiscard = vi.fn();
    const view = render(<DocumentDiscardDialog open onKeep={onKeep} onDiscard={onDiscard} />);

    await user.click(screen.getByRole("button", { name: "Weiter bearbeiten" }));
    expect(onKeep).toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();

    view.rerender(<DocumentDiscardDialog open onKeep={onKeep} onDiscard={onDiscard} />);
    await user.click(screen.getByRole("button", { name: "Ja, neues Dokument" }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
