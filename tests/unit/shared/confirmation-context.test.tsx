import { useEffect, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  ConfirmationProvider,
  type ConfirmationResult,
} from "@/contexts/confirmation-context";
import { useConfirmation } from "@/hooks/_shared/use-confirmation";

function ConfirmationHarness() {
  const { confirm } = useConfirmation();
  const [result, setResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    void confirm({
        title: "Delete item",
        description: "Delete the selected item?",
        onConfirm: async () => {
          throw new Error("Server validation failed");
        },
      })
      .then(setResult);
  }, [confirm]);

  return <div>{result ? `${result.status}:${String(result.confirmed)}` : "pending"}</div>;
}

function ConfirmationControls() {
  const { isOpen, errorMessage, handleConfirm, handleCancel } = useConfirmation();

  return (
    <div>
      <div>{isOpen ? "open" : "closed"}</div>
      <div>{errorMessage ?? "no-error"}</div>
      <button type="button" onClick={() => void handleConfirm()}>
        confirm
      </button>
      <button type="button" onClick={handleCancel}>
        cancel
      </button>
    </div>
  );
}

describe("ConfirmationProvider", () => {
  it("keeps the dialog open and shows the action error instead of resolving as cancel", async () => {
    render(
      <ConfirmationProvider>
        <ConfirmationHarness />
        <ConfirmationControls />
      </ConfirmationProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "confirm" }));

    expect(await screen.findByText("Server validation failed")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "cancel" }));

    await waitFor(() => {
      expect(screen.getByText("cancelled:false")).toBeInTheDocument();
    });
  });
});
