import { describe, expect, it } from "vitest";
import { getCreatePurchaseOrderSubmitError } from "@/components/domain/inventory/create-purchase-order-error-messages";

describe("inventory create purchase order error messages", () => {
  it("suppresses raw purchase order create errors", () => {
    expect(
      getCreatePurchaseOrderSubmitError(
        new Error("insert into purchase_orders violates row-level security policy")
      )
    ).toBe(
      "Purchase order could not be created. Review supplier, quantity, and pricing, then try again."
    );
  });

  it("preserves structured field guidance", () => {
    expect(
      getCreatePurchaseOrderSubmitError({
        errors: {
          supplierId: ["Supplier is required."],
        },
      })
    ).toBe("Supplier is required.");
  });
});
