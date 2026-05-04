import { beforeEach, describe, expect, it, vi } from "vitest";

const dbState = vi.hoisted(() => ({
  selectQueue: [] as Array<Array<Record<string, unknown>>>,
  insertQueue: [] as Array<Array<Record<string, unknown>>>,
  updateQueue: [] as Array<Array<Record<string, unknown>>>,
  insertedValues: [] as Array<Record<string, unknown>>,
  updatedValues: [] as Array<Record<string, unknown>>,
}));

function makeQuery(result: Array<Record<string, unknown>>) {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    offset: () => Promise.resolve(result),
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
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        dbState.insertedValues.push(values);
        return {
          onConflictDoNothing: () => ({
            returning: async () => dbState.insertQueue.shift() ?? [],
          }),
          returning: async () => dbState.insertQueue.shift() ?? [],
        };
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        dbState.updatedValues.push(values);
        return {
          where: () => ({
            returning: async () => dbState.updateQueue.shift() ?? [],
          }),
        };
      },
    }),
  },
}));

describe("suppression helper behavior", () => {
  beforeEach(() => {
    dbState.selectQueue = [];
    dbState.insertQueue = [];
    dbState.updateQueue = [];
    dbState.insertedValues = [];
    dbState.updatedValues = [];
  });

  it("normalizes mixed-case emails for direct add and existing-record lookup", async () => {
    dbState.insertQueue = [[]];
    dbState.selectQueue = [[{ id: "suppression-1" }]];

    const { addSuppressionDirect } = await import(
      "@/server/functions/communications/_shared/suppression-mutations"
    );

    const result = await addSuppressionDirect({
      organizationId: "org-1",
      email: "  Test@Example.COM ",
      reason: "bounce",
      bounceType: "hard",
    });

    expect(result).toEqual({ id: "suppression-1", isNew: false });
    expect(dbState.insertedValues[0]).toMatchObject({
      email: "test@example.com",
      reason: "bounce",
      bounceType: "hard",
    });
  });

  it("returns single and batch suppression results with normalized emails", async () => {
    dbState.selectQueue = [
      [{ reason: "unsubscribe", bounceType: null, createdAt: new Date("2026-04-01") }],
      [{ email: "a@example.com", reason: "bounce", bounceType: "hard", createdAt: new Date("2026-04-02") }],
    ];

    const { isEmailSuppressedDirect, checkSuppressionBatchDirect } = await import(
      "@/server/functions/communications/_shared/suppression-read"
    );

    await expect(isEmailSuppressedDirect("org-1", " A@Example.COM ")).resolves.toMatchObject({
      suppressed: true,
      reason: "unsubscribe",
    });

    await expect(
      checkSuppressionBatchDirect("org-1", ["A@Example.COM", "b@example.com"]),
    ).resolves.toEqual([
      { email: "a@example.com", suppressed: true, reason: "bounce" },
      { email: "b@example.com", suppressed: false, reason: undefined },
    ]);
  });

  it("increments soft bounces and flags suppression at the threshold", async () => {
    dbState.selectQueue = [[{ id: "suppression-1", bounceCount: 2, createdAt: new Date() }]];
    dbState.updateQueue = [[{ bounceCount: 3 }]];

    const { trackSoftBounce } = await import(
      "@/server/functions/communications/_shared/suppression-policy"
    );

    const result = await trackSoftBounce({
      organizationId: "org-1",
      email: "Soft@Example.COM",
      resendEventId: "evt-1",
      metadata: { bounceMessage: "Mailbox full" },
    });

    expect(result).toMatchObject({
      id: "suppression-1",
      bounceCount: 3,
      suppressed: true,
      isNew: false,
    });
    expect(dbState.updatedValues[0]).toHaveProperty("bounceCount");
  });
});
