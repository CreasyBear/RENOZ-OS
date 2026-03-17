import { describe, expect, it } from "vitest";
import { calculateEffectiveSupplierPrice } from "@/lib/suppliers/price-utils";

describe("calculateEffectivePrice", () => {
  it("applies percentage discounts without going negative", () => {
    expect(
      calculateEffectiveSupplierPrice({
        basePrice: 100,
        discountType: "percentage",
        discountValue: 15,
      })
    ).toBe(85);
  });

  it("applies fixed discounts without going negative", () => {
    expect(
      calculateEffectiveSupplierPrice({
        basePrice: 25,
        discountType: "fixed",
        discountValue: 40,
      })
    ).toBe(0);
  });
});
