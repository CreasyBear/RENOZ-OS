import { describe, expect, it } from "vitest";
import { createPurchaseOrderSchema } from "@/lib/schemas/purchase-orders";

describe("createPurchaseOrderSchema", () => {
  it("accepts the contextual PO wizard payload shape and applies shared defaults", () => {
    const parsed = createPurchaseOrderSchema.parse({
      supplierId: "11111111-1111-4111-8111-111111111111",
      expectedDeliveryDate: "2026-04-15",
      paymentTerms: "Net 30",
      notes: "Order more widgets",
      items: [
        {
          productId: "22222222-2222-4222-8222-222222222222",
          productName: "Widget",
          productSku: "W-1",
          quantity: 2,
          unitPrice: 12.5,
        },
      ],
    });

    expect(parsed.currency).toBe("AUD");
    expect(parsed.items[0]).toMatchObject({
      unitOfMeasure: "each",
      discountPercent: 0,
      taxRate: 10,
    });
  });
});
