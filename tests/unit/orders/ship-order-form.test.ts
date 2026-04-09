import { describe, expect, it } from "vitest";
import { shipOrderFormSchema } from "@/lib/schemas/orders/ship-order-form";

describe("ship order form schema", () => {
  it("requires a custom carrier name when Other is selected", () => {
    const result = shipOrderFormSchema.safeParse({
      carrier: "other",
      customCarrier: "",
      shipNow: true,
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.customCarrier).toContain(
      "Enter the carrier name"
    );
  });

  it("accepts a custom carrier name when Other is selected", () => {
    const result = shipOrderFormSchema.safeParse({
      carrier: "other",
      customCarrier: "My Courier",
      shipNow: true,
    });

    expect(result.success).toBe(true);
  });
});
