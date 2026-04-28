import { beforeEach, describe, expect, it, vi } from "vitest";

const dbState = vi.hoisted(() => ({
  insertQueue: [] as Array<Array<Record<string, unknown>>>,
  selectQueue: [] as Array<Array<Record<string, unknown>>>,
  updates: [] as Array<Record<string, unknown>>,
  committedPayments: [] as Array<Record<string, unknown>>,
  updatedOrder: { paidAmount: "100.00", balanceDue: "0.00", paymentStatus: "paid" },
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

vi.mock("@/server/functions/orders/order-payments", () => ({
  updateOrderPaymentStatus: vi.fn(async () => undefined),
}));

vi.mock("@/server/functions/financial/xero-adapter", () => ({
  getXeroErrorMessage: (error: unknown) => error instanceof Error ? error.message : String(error),
  getXeroPaymentById: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => dbState.insertQueue.shift() ?? [],
        }),
      }),
    }),
    select: () => makeQuery(dbState.selectQueue.shift() ?? []),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        dbState.updates.push(values);
        return { where: async () => undefined };
      },
    }),
    transaction: async (
      callback: (tx: {
        insert: () => { values: (values: Record<string, unknown>) => Promise<void> };
        select: () => ReturnType<typeof makeQuery>;
      }) => Promise<unknown>,
    ) => {
      const stagedPayments: Array<Record<string, unknown>> = [];
      const tx = {
        insert: () => ({
          values: async (values: Record<string, unknown>) => {
            stagedPayments.push(values);
          },
        }),
        select: () => makeQuery([dbState.updatedOrder]),
      };
      const result = await callback(tx);
      dbState.committedPayments.push(...stagedPayments);
      return result;
    },
  },
}));

describe("Xero payment reconciliation behavior", () => {
  beforeEach(() => {
    dbState.insertQueue = [];
    dbState.selectQueue = [];
    dbState.updates = [];
    dbState.committedPayments = [];
    dbState.updatedOrder = { paidAmount: "100.00", balanceDue: "0.00", paymentStatus: "paid" };
  });

  it("treats duplicate payment events as successful no-ops", async () => {
    dbState.insertQueue = [[]];

    const { applyXeroPaymentUpdate } = await import(
      "@/server/functions/financial/_shared/xero-payment-reconciliation"
    );

    await expect(
      applyXeroPaymentUpdate({
        organizationId: "org-1",
        xeroInvoiceId: "invoice-1",
        paymentId: "payment-1",
        amountPaid: 100,
        paymentDate: "2026-04-01",
      }),
    ).resolves.toMatchObject({
      success: true,
      duplicate: true,
      resultState: "duplicate",
    });
    expect(dbState.committedPayments).toEqual([]);
  });

  it("records unknown invoices without writing order payments", async () => {
    dbState.insertQueue = [[{ id: "event-1" }]];
    dbState.selectQueue = [[]];

    const { applyXeroPaymentUpdate } = await import(
      "@/server/functions/financial/_shared/xero-payment-reconciliation"
    );

    await expect(
      applyXeroPaymentUpdate({
        organizationId: "org-1",
        xeroInvoiceId: "missing-invoice",
        paymentId: "payment-1",
        amountPaid: 100,
        paymentDate: "2026-04-01",
      }),
    ).resolves.toMatchObject({
      success: false,
      resultState: "unknown_invoice",
    });
    expect(dbState.updates).toEqual(
      expect.arrayContaining([expect.objectContaining({ resultState: "unknown_invoice" })]),
    );
    expect(dbState.committedPayments).toEqual([]);
  });

  it("applies valid payments and records event state", async () => {
    dbState.insertQueue = [[{ id: "event-1" }]];
    dbState.selectQueue = [[{
      id: "order-1",
      total: 100,
      organizationId: "org-1",
      createdBy: "user-1",
      updatedBy: "user-2",
    }]];

    const { applyXeroPaymentUpdate } = await import(
      "@/server/functions/financial/_shared/xero-payment-reconciliation"
    );

    await expect(
      applyXeroPaymentUpdate({
        organizationId: "org-1",
        xeroInvoiceId: "invoice-1",
        paymentId: "payment-1",
        amountPaid: 100,
        paymentDate: "2026-04-01",
      }),
    ).resolves.toMatchObject({
      success: true,
      resultState: "applied",
      orderId: "order-1",
    });
    expect(dbState.committedPayments).toHaveLength(1);
    expect(dbState.updates).toEqual(
      expect.arrayContaining([expect.objectContaining({ resultState: "applied" })]),
    );
  });

  it("returns retry batch policy when any webhook event is retryable", async () => {
    const { processXeroPaymentWebhookEvents } = await import(
      "@/server/functions/financial/_shared/xero-payment-reconciliation"
    );

    const result = await processXeroPaymentWebhookEvents(
      [{ id: "evt-1" }, { id: "evt-2" }],
      vi.fn()
        .mockResolvedValueOnce({ success: true, duplicate: false, resultState: "applied" })
        .mockResolvedValueOnce({ success: false, retryable: true, resultState: "processing" }) as never,
    );

    expect(result).toMatchObject({
      status: "retry",
      httpStatus: 503,
    });
  });
});
