import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { BulkOperations } from "@/components/domain/customers/bulk/bulk-operations";

describe("BulkOperations", () => {
  it("disables bulk email and shows an explicit unavailable reason", () => {
    render(
      <BulkOperations
        selectedCount={3}
        selectedIds={["c1", "c2", "c3"]}
        selectedCustomers={[
          { id: "c1", status: "active", tags: [] },
          { id: "c2", status: "active", tags: [] },
          { id: "c3", status: "lead", tags: [] },
        ]}
        availableTags={[]}
        onUpdateStatus={vi.fn()}
        onAssignTags={vi.fn()}
        onDelete={vi.fn()}
        onExport={vi.fn()}
        canBulkEmail={false}
        bulkEmailUnavailableReason="Bulk email is temporarily unavailable until the communications flow supports preselecting customers end-to-end."
      />
    );

    expect(
      screen.getByRole("button", { name: /send email/i })
    ).toBeDisabled();
    expect(screen.getByText(/bulk email unavailable/i)).toBeInTheDocument();
    expect(
      screen.getByText(/temporarily unavailable until the communications flow supports preselecting customers/i)
    ).toBeInTheDocument();
  });
});
