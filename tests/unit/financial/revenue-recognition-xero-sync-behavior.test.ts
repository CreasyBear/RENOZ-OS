import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReadiness = vi.hoisted(() => vi.fn());
const mockFindJournal = vi.hoisted(() => vi.fn());
const mockSyncJournal = vi.hoisted(() => vi.fn());
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
    innerJoin: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(result),
    then: (
      resolve: (value: Array<Record<string, unknown>>) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

vi.mock("@tanstack/react-start/server", () => ({
  setResponseStatus: vi.fn(),
}));

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
  findManualJournalByReference: (...args: unknown[]) => mockFindJournal(...args),
  syncManualJournalWithXero: (...args: unknown[]) => mockSyncJournal(...args),
  getXeroErrorMessage: (error: unknown) => mockXeroError(error),
}));

const ctx = {
  organizationId: "org-1",
  user: { id: "user-1" },
} as never;

function recognition(overrides: Record<string, unknown> = {}) {
  return {
    id: "recognition-1",
    state: "ready",
    recognitionType: "milestone",
    milestoneName: "Install",
    recognizedAmount: "1200.00",
    recognitionDate: "2026-04-01",
    xeroJournalId: null,
    xeroSyncAttempts: 0,
    orderId: "order-1",
    orderNumber: "ORD-1",
    customerId: "customer-1",
    customerName: "Customer",
    ...overrides,
  };
}

const orgWithAccounts = {
  settings: {
    xeroRevenueRecognitionRevenueAccount: "400",
    xeroRevenueRecognitionDeferredAccount: "800",
  },
};

describe("revenue recognition Xero sync behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbState.selectQueue = [];
    dbState.updates = [];
    mockReadiness.mockResolvedValue({ available: true });
    mockFindJournal.mockResolvedValue(null);
    mockSyncJournal.mockResolvedValue({ manualJournalId: "journal-1" });
  });

  it("returns an idempotent success when already synced and force is false", async () => {
    dbState.selectQueue = [[recognition({ state: "synced", xeroJournalId: "journal-existing" })]];

    const { syncRevenueRecognitionToXero } = await import(
      "@/server/functions/financial/_shared/revenue-recognition-xero-sync"
    );

    await expect(
      syncRevenueRecognitionToXero(ctx, { recognitionId: "recognition-1", force: false }),
    ).resolves.toMatchObject({
      success: true,
      xeroJournalId: "journal-existing",
      state: "synced",
    });
    expect(mockSyncJournal).not.toHaveBeenCalled();
  });

  it("records a clear failure when Xero revenue accounts are missing", async () => {
    dbState.selectQueue = [[recognition()], [{ settings: {} }]];

    const { syncRevenueRecognitionToXero } = await import(
      "@/server/functions/financial/_shared/revenue-recognition-xero-sync"
    );

    await expect(
      syncRevenueRecognitionToXero(ctx, { recognitionId: "recognition-1", force: false }),
    ).resolves.toMatchObject({
      success: false,
      error: "Xero revenue recognition account settings need attention before journals can sync.",
    });
    expect(dbState.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          xeroSyncError: expect.stringContaining("Xero revenue recognition accounts"),
        }),
      ]),
    );
  });

  it("returns safe copy when Xero readiness is unavailable", async () => {
    dbState.selectQueue = [[recognition()]];
    mockReadiness.mockResolvedValue({
      available: false,
      message: "No active Xero accounting connection with refresh_token provider stack",
    });

    const { syncRevenueRecognitionToXero } = await import(
      "@/server/functions/financial/_shared/revenue-recognition-xero-sync"
    );

    await expect(
      syncRevenueRecognitionToXero(ctx, { recognitionId: "recognition-1", force: false }),
    ).resolves.toMatchObject({
      success: false,
      error: "Xero connection needs attention before revenue journals can sync.",
      integrationAvailable: false,
    });
  });

  it("reconciles an existing manual journal without creating a duplicate", async () => {
    dbState.selectQueue = [[recognition()], [orgWithAccounts]];
    mockFindJournal.mockResolvedValue({ manualJournalId: "journal-existing" });

    const { syncRevenueRecognitionToXero } = await import(
      "@/server/functions/financial/_shared/revenue-recognition-xero-sync"
    );

    await expect(
      syncRevenueRecognitionToXero(ctx, { recognitionId: "recognition-1", force: false }),
    ).resolves.toMatchObject({
      success: true,
      xeroJournalId: "journal-existing",
      state: "synced",
    });
    expect(mockSyncJournal).not.toHaveBeenCalled();
  });

  it("moves to manual override when provider failures exceed the retry threshold", async () => {
    dbState.selectQueue = [[recognition({ xeroSyncAttempts: 4 })], [orgWithAccounts]];
    mockSyncJournal.mockRejectedValue(new Error("Xero validation failed"));

    const { syncRevenueRecognitionToXero } = await import(
      "@/server/functions/financial/_shared/revenue-recognition-xero-sync"
    );

    const result = await syncRevenueRecognitionToXero(ctx, { recognitionId: "recognition-1", force: false });

    expect(result).toMatchObject({
      success: false,
      error: "Revenue recognition needs manual accounting review before another Xero sync attempt.",
      state: "manual_override",
      attempts: 5,
    });
    expect(JSON.stringify(result)).not.toContain("Xero validation failed");
    expect(dbState.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          state: "manual_override",
          xeroSyncAttempts: 5,
          xeroSyncError: "Xero validation failed",
        }),
      ]),
    );
  });
});
