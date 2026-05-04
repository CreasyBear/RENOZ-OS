import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSuppression = vi.hoisted(() => vi.fn());
const mockRender = vi.hoisted(() => vi.fn());
const mockPrepareTracking = vi.hoisted(() => vi.fn());
const mockActivities = vi.hoisted(() => vi.fn());
const mockSend = vi.hoisted(() => vi.fn());

const dbState = vi.hoisted(() => ({
  selectQueue: [] as Array<Array<Record<string, unknown>>>,
  insertQueue: [] as Array<Array<Record<string, unknown>>>,
  updates: [] as Array<Record<string, unknown>>,
  inserts: [] as Array<Record<string, unknown>>,
}));

function makeQuery(result: Array<Record<string, unknown>>) {
  const chain = {
    from: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(result),
    then: (
      resolve: (value: Array<Record<string, unknown>>) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: mockSend } })),
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
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        dbState.inserts.push(values);
        return { returning: async () => dbState.insertQueue.shift() ?? [] };
      },
    }),
  },
}));

vi.mock("@/server/functions/communications/_shared/suppression-read", () => ({
  checkSuppressionBatchDirect: (...args: unknown[]) => mockSuppression(...args),
}));

vi.mock("@/lib/server/outbound-email", () => ({
  renderOutboundEmail: (...args: unknown[]) => mockRender(...args),
  renderHtmlToText: (html: string) => html.replace(/<[^>]+>/g, ""),
}));

vi.mock("@/lib/server/email-tracking", () => ({
  TRACKING_BASE_URL: "https://track.example.com",
  prepareEmailForTracking: (...args: unknown[]) => mockPrepareTracking(...args),
}));

vi.mock("@/lib/server/activity-bridge", () => ({
  createEmailActivitiesBatch: (...args: unknown[]) => mockActivities(...args),
}));

vi.mock("@/lib/server/unsubscribe-tokens", () => ({
  generateUnsubscribeUrl: () => "https://unsubscribe.example.com/token",
}));

const logger = {
  info: vi.fn(),
  error: vi.fn(),
};

function campaign(overrides: Record<string, unknown> = {}) {
  return {
    id: "campaign-1",
    organizationId: "org-1",
    status: "scheduled",
    templateType: "custom",
    templateData: {},
    createdById: "user-1",
    sentCount: 0,
    failedCount: 0,
    ...overrides,
  };
}

function recipient(overrides: Record<string, unknown> = {}) {
  return {
    id: "recipient-1",
    campaignId: "campaign-1",
    organizationId: "org-1",
    contactId: "contact-1",
    customerId: "customer-1",
    contactCustomerId: null,
    email: "customer@example.com",
    name: "Customer Person",
    recipientData: {},
    ...overrides,
  };
}

function renderedEmail() {
  return {
    subject: "Hello",
    bodyHtml: "<p>Hello</p>",
    bodyText: "Hello",
    previewText: null,
    replyTo: null,
    priority: null,
    templateId: "template-1",
    templateVersion: 1,
    trackOpens: true,
    trackClicks: true,
  };
}

describe("campaign send processing behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbState.selectQueue = [];
    dbState.insertQueue = [];
    dbState.updates = [];
    dbState.inserts = [];
    mockPrepareTracking.mockReturnValue({ html: "<p>Hello tracked</p>", linkMap: new Map() });
    mockActivities.mockResolvedValue({ success: true, count: 1 });
  });

  it("completes explicitly when a campaign has no recipients", async () => {
    dbState.selectQueue = [[campaign()], [], [campaign({ sentCount: 0, failedCount: 0 })]];

    const { processCampaignSend } = await import(
      "@/server/functions/communications/_shared/campaign-send-processing"
    );

    await expect(processCampaignSend({ campaignId: "campaign-1" }, { logger })).resolves.toEqual({
      campaignId: "campaign-1",
      status: "sent",
      stats: { sent: 0, failed: 0, batches: 1 },
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("skips suppressed recipients without provider sends", async () => {
    dbState.selectQueue = [
      [campaign()],
      [recipient()],
      [],
      [campaign({ sentCount: 0, failedCount: 0 })],
    ];
    mockSuppression.mockResolvedValue([
      { email: "customer@example.com", suppressed: true, reason: "bounce" },
    ]);

    const { processCampaignSend } = await import(
      "@/server/functions/communications/_shared/campaign-send-processing"
    );

    await processCampaignSend({ campaignId: "campaign-1" }, { logger });

    expect(mockSend).not.toHaveBeenCalled();
    expect(dbState.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "skipped",
          errorMessage: "Suppressed: bounce",
        }),
      ]),
    );
  });

  it("marks only the failed recipient when the provider rejects a send", async () => {
    dbState.selectQueue = [
      [campaign()],
      [recipient()],
      [],
      [campaign({ sentCount: 0, failedCount: 1 })],
    ];
    dbState.insertQueue = [[{ id: "email-1" }]];
    mockSuppression.mockResolvedValue([{ email: "customer@example.com", suppressed: false }]);
    mockRender.mockResolvedValue(renderedEmail());
    mockSend.mockResolvedValue({ data: null, error: { message: "Provider down" } });

    const { processCampaignSend } = await import(
      "@/server/functions/communications/_shared/campaign-send-processing"
    );

    await expect(processCampaignSend({ campaignId: "campaign-1" }, { logger })).resolves.toMatchObject({
      status: "failed",
      stats: { sent: 0, failed: 1 },
    });
    expect(dbState.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "failed",
          errorMessage: "Provider down",
        }),
        expect.objectContaining({ status: "failed" }),
      ]),
    );
  });

  it("preserves successful sends when a later recipient fails", async () => {
    dbState.selectQueue = [
      [campaign()],
      [
        recipient({ id: "recipient-1", email: "one@example.com" }),
        recipient({ id: "recipient-2", email: "two@example.com" }),
      ],
      [],
      [campaign({ sentCount: 1, failedCount: 1 })],
    ];
    dbState.insertQueue = [[{ id: "email-1" }], [{ id: "email-2" }]];
    mockSuppression.mockResolvedValue([
      { email: "one@example.com", suppressed: false },
      { email: "two@example.com", suppressed: false },
    ]);
    mockRender.mockResolvedValue(renderedEmail());
    mockSend
      .mockResolvedValueOnce({ data: { id: "resend-1" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "Provider down" } });

    const { processCampaignSend } = await import(
      "@/server/functions/communications/_shared/campaign-send-processing"
    );

    await expect(processCampaignSend({ campaignId: "campaign-1" }, { logger })).resolves.toMatchObject({
      status: "sent",
      stats: { sent: 1, failed: 1 },
    });
    expect(dbState.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "sent", emailHistoryId: "email-1" }),
        expect.objectContaining({ status: "failed", errorMessage: "Provider down" }),
      ]),
    );
  });
});
