import { beforeEach, describe, expect, it, vi } from "vitest";

const dbState = vi.hoisted(() => ({
  insertQueue: [] as Array<Array<Record<string, unknown>>>,
  txInsertQueue: [] as Array<Array<Record<string, unknown>>>,
  selectQueue: [] as Array<Array<Record<string, unknown>>>,
  updates: [] as Array<Record<string, unknown>>,
  txExecutions: [] as Array<unknown>,
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
        execute: (query: unknown) => Promise<void>;
        insert: () => {
          values: (values: Record<string, unknown>) => {
            returning: () => Promise<Array<Record<string, unknown>>>;
          };
        };
        select: () => ReturnType<typeof makeQuery>;
      }) => Promise<unknown>,
    ) => {
      const stagedPayments: Array<Record<string, unknown>> = [];
      const tx = {
        execute: async (query: unknown) => {
          dbState.txExecutions.push(query);
        },
        insert: () => ({
          values: (values: Record<string, unknown>) => {
            stagedPayments.push(values);
            return {
              returning: async () => dbState.txInsertQueue.shift() ?? [{ id: "payment-ledger-1" }],
            };
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
    dbState.txInsertQueue = [];
    dbState.selectQueue = [];
    dbState.updates = [];
    dbState.txExecutions = [];
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
      error: "No local order matched this Xero invoice. The payment was not applied.",
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
    expect(dbState.committedPayments[0]).toMatchObject({
      organizationId: "org-1",
      orderId: "order-1",
      paymentMethod: "xero",
      recordedBy: "user-2",
      createdBy: "user-2",
      updatedBy: "user-2",
    });
    expect(dbState.txExecutions).toHaveLength(1);
    expect(dbState.updates).toEqual(
      expect.arrayContaining([expect.objectContaining({ resultState: "applied" })]),
    );
  });

  it("rejects Xero applies when the payment ledger insert does not return a row", async () => {
    dbState.insertQueue = [[{ id: "event-1" }]];
    dbState.txInsertQueue = [[]];
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
      success: false,
      resultState: "rejected",
      error: "The Xero payment could not be safely applied. Review the payment event audit.",
    });
    expect(dbState.committedPayments).toEqual([]);
    expect(dbState.updates).toEqual(
      expect.arrayContaining([expect.objectContaining({ resultState: "rejected" })]),
    );
  });

  it("returns safe webhook tenant resolution failures without echoing tenant ids", async () => {
    dbState.selectQueue = [[]];

    const { applyXeroPaymentWebhookEvent } = await import(
      "@/server/functions/financial/_shared/xero-payment-reconciliation"
    );

    const result = await applyXeroPaymentWebhookEvent({
      id: "evt-tenant",
      eventCategory: "PAYMENT",
      eventType: "CREATE",
      tenantId: "tenant-secret-1",
      resourceId: "payment-secret-1",
    });

    expect(result).toMatchObject({
      success: false,
      resultState: "rejected",
      retryable: false,
      error: "Xero payment webhook could not be matched to an active accounting connection.",
    });
    expect(JSON.stringify(result)).not.toContain("tenant-secret-1");
    expect(JSON.stringify(result)).not.toContain("payment-secret-1");
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

  it("sanitizes webhook batch results before route responses and logs can expose them", async () => {
    const { processXeroPaymentWebhookEvents } = await import(
      "@/server/functions/financial/_shared/xero-payment-reconciliation"
    );

    const result = await processXeroPaymentWebhookEvents(
      [{ id: "evt-1" }, { id: "evt-2" }],
      vi.fn()
        .mockResolvedValueOnce({
          success: true,
          duplicate: false,
          resultState: "applied",
          orderId: "order-secret-1",
          xeroInvoiceId: "invoice-secret-1",
        })
        .mockResolvedValueOnce({
          success: false,
          retryable: true,
          resultState: "processing",
          error: "provider stack leaked refresh_token for tenant-secret-1",
          organizationId: "org-secret-1",
          tenantId: "tenant-secret-1",
          paymentId: "payment-secret-1",
        }) as never,
    );

    expect(result).toMatchObject({
      status: "retry",
      httpStatus: 503,
      results: [
        { success: true, resultState: "applied" },
        {
          success: false,
          resultState: "processing",
          retryable: true,
          error: "Xero payment processing is temporarily unavailable. Xero should retry this event.",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("order-secret-1");
    expect(JSON.stringify(result)).not.toContain("invoice-secret-1");
    expect(JSON.stringify(result)).not.toContain("refresh_token");
    expect(JSON.stringify(result)).not.toContain("tenant-secret-1");
    expect(JSON.stringify(result)).not.toContain("org-secret-1");
    expect(JSON.stringify(result)).not.toContain("payment-secret-1");
  });
});
