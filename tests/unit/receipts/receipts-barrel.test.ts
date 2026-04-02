import { describe, expect, it, vi } from "vitest";

vi.mock("resend", () => ({
  Resend: class MockResend {},
}));

// Barrel re-exports heavy domain modules; stub them so this contract test stays fast under parallel vitest.
vi.mock("@/components/domain/receipts/receipt-history", () => ({
  ReceiptHistory: () => null,
}));
vi.mock("@/components/domain/receipts/quality-inspection", () => ({
  QualityInspection: () => null,
}));
vi.mock("@/components/domain/receipts/quality-dashboard", () => ({
  QualityDashboard: () => null,
}));

describe("receipts barrel exports", () => {
  it("does not expose the retired ReceiptCreationDialog", async () => {
    const receipts = await import("@/components/domain/receipts");

    expect(receipts).not.toHaveProperty("ReceiptCreationDialog");
  });
});
