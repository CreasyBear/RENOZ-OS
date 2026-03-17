import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { MergeHistory } from "@/components/domain/customers/duplicates/merge-history";

describe("MergeHistory", () => {
  it("disables undo and explains why when merge recovery is unavailable", async () => {
    render(
      <MergeHistory
        history={[
          {
            id: "merge-1",
            primaryCustomerId: "c-1",
            mergedCustomerId: "c-2",
            action: "merged",
            performedBy: "user-1",
            performedAt: "2026-03-16T00:00:00.000Z",
            primaryCustomer: { id: "c-1", code: "CUST-001", name: "Primary Customer" },
            secondaryCustomer: { id: "c-2", code: "CUST-002", name: "Secondary Customer" },
          },
        ]}
        onViewCustomer={vi.fn()}
        onUndo={vi.fn()}
        canUndo={false}
        undoUnavailableReason="Undo merge is not available yet."
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /details/i }));

    expect(await screen.findByRole("button", { name: /undo merge/i })).toBeDisabled();
    expect(screen.getByText(/undo merge is not available yet/i)).toBeInTheDocument();
  });
});
