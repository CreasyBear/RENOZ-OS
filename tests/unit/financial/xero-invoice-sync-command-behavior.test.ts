import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReadiness = vi.hoisted(() => vi.fn());
const mockFindInvoice = vi.hoisted(() => vi.fn());
const mockSyncInvoice = vi.hoisted(() => vi.fn());
const mockXeroError = vi.hoisted(() => vi.fn((error: unknown) =>
  error instanceof Error ? error.message : String(error),
));

const dbState = vi.hoisted(() => ({
  selectQueue: [] as Array<Array<Record<string, unknown>>>,
  updates: [] as Array<Record<string, unknown>>,
}));

function makeQuery(result: Array<Record<string, unknown>>) {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(result),
    then: (
      resolve: (value: Array<Record<string, unknown>>) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

vi.mock("@/lib/db", () => ({
  db: {
    select: () => makeQuery(dbState.selectQueue.shift() ?? []),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        dbState.updates.push(values);
        return { where: async () => undefined };
      },
    }),
  },
}));

vi.mock("@/server/functions/financial/xero-adapter", () => ({
  getXeroSyncReadiness: (...args: unknown[]) => mockReadiness(...args),
  findInvoiceByReference: (...args: unknown[]) => mockFindInvoice(...args),
  syncInvoiceWithXero: (...args: unknown[]) => mockSyncInvoice(...args),
  getXeroErrorMessage: (error: unknown) => mockXeroError(error),
}));

const ctx = {
  organizationId: "org-1",
  user: { id: "user-1" },
} as never;

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderNumber: "ORD-1",
    orderDate: "2026-04-01",
    total: 1200,
    subtotal: 1000,
    taxAmount: 200,
    status: "confirmed",
    xeroInvoiceId: null,
    xeroSyncStatus: "pending",
    customerId: "customer-1",
    ...overrides,
  };
}

function customer(overrides: Record<string, unknown> = {}) {
  return {
    name: "Customer",
    email: "customer@example.com",
    xeroContactId: "contact-1",
    ...overrides,
  };
}

const lineItem = {
  description: "Battery",
  quantity: 1,
  unitPrice: 1000,
  lineTotal: 1000,
  taxAmount: 0,
  sku: "BAT-1",
};

describe("Xero invoice sync command behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbState.selectQueue = [];
    dbState.updates = [];
    mockReadiness.mockResolvedValue({ available: true });
    mockFindInvoice.mockResolvedValue(null);
    mockSyncInvoice.mockResolvedValue({ invoiceId: "invoice-1", invoiceUrl: "https://xero/invoice-1" });
  });

  it("persists staged error state when Xero is disconnected", async () => {
    mockReadiness.mockResolvedValue({ available: false, message: "No active Xero accounting connection" });

    const { syncInvoiceToXeroCommand } = await import(
      "@/server/functions/financial/_shared/xero-invoice-sync-command"
    );

    await expect(syncInvoiceToXeroCommand(ctx, { orderId: "order-1", force: false })).resolves.toMatchObject({
      success: false,
      status: "error",
      stages: { readiness: { status: "failed" }, persist: { status: "completed" } },
    });
    expect(dbState.updates[0]).toMatchObject({
      xeroSyncStatus: "error",
      xeroSyncError: "No active Xero accounting connection",
    });
  });

  it("blocks sync and persists error when customer mapping is missing", async () => {
    dbState.selectQueue = [[order()], [customer({ xeroContactId: null })]];

    const { syncInvoiceToXeroCommand } = await import(
      "@/server/functions/financial/_shared/xero-invoice-sync-command"
    );

    await expect(syncInvoiceToXeroCommand(ctx, { orderId: "order-1", force: false })).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("trusted Xero contact mapping"),
      stages: { validation: { status: "failed" }, persist: { status: "completed" } },
    });
    expect(mockSyncInvoice).not.toHaveBeenCalled();
  });

  it("reconciles an existing remote invoice without creating another one", async () => {
    dbState.selectQueue = [[order()], [customer()], [lineItem], [{ defaultPaymentTerms: 14, settings: {} }]];
    mockFindInvoice.mockResolvedValue({ invoiceId: "remote-invoice", invoiceUrl: "https://xero/remote" });

    const { syncInvoiceToXeroCommand } = await import(
      "@/server/functions/financial/_shared/xero-invoice-sync-command"
    );

    await expect(syncInvoiceToXeroCommand(ctx, { orderId: "order-1", force: false })).resolves.toMatchObject({
      success: true,
      status: "synced",
      xeroInvoiceId: "remote-invoice",
    });
    expect(mockSyncInvoice).not.toHaveBeenCalled();
    expect(dbState.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          xeroInvoiceId: "remote-invoice",
          xeroSyncStatus: "synced",
        }),
      ]),
    );
  });

  it("persists provider failure with a staged result", async () => {
    dbState.selectQueue = [[order()], [customer()], [lineItem], [{ defaultPaymentTerms: 14, settings: {} }]];
    mockSyncInvoice.mockRejectedValue(new Error("Xero provider failed"));

    const { syncInvoiceToXeroCommand } = await import(
      "@/server/functions/financial/_shared/xero-invoice-sync-command"
    );

    await expect(syncInvoiceToXeroCommand(ctx, { orderId: "order-1", force: false })).resolves.toMatchObject({
      success: false,
      status: "error",
      error: "Xero provider failed",
      stages: { sync: { status: "failed" }, persist: { status: "completed" } },
    });
    expect(dbState.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          xeroSyncStatus: "error",
          xeroSyncError: "Xero provider failed",
        }),
      ]),
    );
  });
});
