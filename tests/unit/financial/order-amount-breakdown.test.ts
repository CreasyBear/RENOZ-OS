import { describe, expect, it } from "vitest";
import { calculateOrderAmountBreakdown } from "@/lib/utils/financial";

describe("calculateOrderAmountBreakdown", () => {
  it("rounds discounts, tax, and totals consistently for order amendment previews", () => {
    const result = calculateOrderAmountBreakdown({
      lineSubtotal: 33.35,
      shippingAmount: 4.99,
      discountPercent: 10,
      discountAmount: 1.11,
    });

    expect(result).toEqual({
      lineSubtotal: 33.35,
      percentDiscountAmount: 3.34,
      totalDiscountAmount: 4.45,
      subtotal: 28.9,
      shippingAmount: 4.99,
      taxableAmount: 33.89,
      taxAmount: 3.39,
      total: 37.28,
    });
  });
});
