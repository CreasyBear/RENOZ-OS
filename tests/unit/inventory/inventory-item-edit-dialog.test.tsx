import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { InventoryItemEditDialog } from "@/components/domain/inventory/inventory-item-edit-dialog";

const product = {
  id: "product-1",
  sku: "BAT-100",
  name: "Battery 100Ah",
  description: "Lithium battery",
  barcode: "123456789",
  basePrice: 1200,
  costPrice: 900,
  weight: 22,
  isActive: true,
  isSellable: true,
  trackInventory: true,
};

beforeAll(() => {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserver,
    writable: true,
  });
});

describe("InventoryItemEditDialog", () => {
  it("shows stable update guidance instead of raw submit errors", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error("duplicate key value violates unique constraint products_sku_key"));

    render(
      <InventoryItemEditDialog
        open
        onClose={vi.fn()}
        product={product}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(
        screen.getByText("Inventory item details could not be updated. Please refresh and try again.")
      ).toBeInTheDocument()
    );
    expect(
      screen.queryByText("duplicate key value violates unique constraint products_sku_key")
    ).not.toBeInTheDocument();
  });
});
