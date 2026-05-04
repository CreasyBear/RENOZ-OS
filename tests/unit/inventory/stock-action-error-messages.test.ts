import { describe, expect, it } from "vitest";
import {
  getStockAdjustmentSubmitError,
  getStockTransferSubmitError,
} from "@/components/domain/inventory/stock-action-error-messages";

describe("stock action error messages", () => {
  it("suppresses raw stock adjustment errors", () => {
    expect(
      getStockAdjustmentSubmitError(
        new Error("update inventory set quantity_on_hand = -1 violates check constraint")
      )
    ).toBe("Inventory adjustment could not be completed. Please refresh and try again.");
  });

  it("suppresses raw stock transfer errors", () => {
    expect(
      getStockTransferSubmitError(
        new Error("insert into inventory_movements violates row-level security policy")
      )
    ).toBe("Inventory transfer could not be completed. Please refresh and try again.");
  });

  it("preserves field validation guidance from structured errors", () => {
    expect(
      getStockAdjustmentSubmitError({
        errors: {
          adjustmentQty: ["Adjustment quantity exceeds available stock."],
        },
      })
    ).toBe("Adjustment quantity exceeds available stock.");
  });
});
