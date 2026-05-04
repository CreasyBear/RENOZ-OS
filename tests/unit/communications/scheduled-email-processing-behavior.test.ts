import { beforeEach, describe, expect, it, vi } from "vitest";

class MockTemplateUnresolvedError extends Error {}

const mockDueEmails = vi.hoisted(() => vi.fn());
const mockSuppression = vi.hoisted(() => vi.fn());
const mockMarkSent = vi.hoisted(() => vi.fn());
const mockRender = vi.hoisted(() => vi.fn());
const mockPrepareTracking = vi.hoisted(() => vi.fn());
const mockActivity = vi.hoisted(() => vi.fn());
const mockSend = vi.hoisted(() => vi.fn());

const dbState = vi.hoisted(() => ({
  updateReturnQueue: [] as Array<Array<Record<string, unknown>>>,
  insertReturnQueue: [] as Array<Array<Record<string, unknown>>>,
  updates: [] as Array<Record<string, unknown>>,
  inserts: [] as Array<Record<string, unknown>>,
}));

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: mockSend } })),
}));

vi.mock("@/lib/db", () => ({
  db: {
    update: () => ({
      set: (values: Record<string, unknown>) => {
        dbState.updates.push(values);
        return {
          where: () => ({
            returning: async () => dbState.updateReturnQueue.shift() ?? [],
          }),
        };
      },
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        dbState.inserts.push(values);
        return {
          returning: async () => dbState.insertReturnQueue.shift() ?? [],
        };
      },
    }),
  },
}));

vi.mock("@/server/functions/communications/_shared/scheduled-email-read", () => ({
  getDueScheduledEmails: (...args: unknown[]) => mockDueEmails(...args),
}));

vi.mock("@/server/functions/communications/_shared/scheduled-email-mutations", () => ({
  markScheduledEmailAsSent: (...args: unknown[]) => mockMarkSent(...args),
}));

vi.mock("@/server/functions/communications/_shared/suppression-read", () => ({
  isEmailSuppressedDirect: (...args: unknown[]) => mockSuppression(...args),
}));

vi.mock("@/lib/server/outbound-email", () => ({
  renderOutboundEmail: (...args: unknown[]) => mockRender(...args),
  renderHtmlToText: (html: string) => html.replace(/<[^>]+>/g, ""),
  TemplateUnresolvedError: MockTemplateUnresolvedError,
}));

vi.mock("@/lib/server/email-tracking", () => ({
  TRACKING_BASE_URL: "https://track.example.com",
  prepareEmailForTracking: (...args: unknown[]) => mockPrepareTracking(...args),
}));

vi.mock("@/lib/server/activity-bridge", () => ({
  createEmailSentActivity: (...args: unknown[]) => mockActivity(...args),
}));

vi.mock("@/lib/server/unsubscribe-tokens", () => ({
  generateUnsubscribeUrl: () => "https://unsubscribe.example.com/token",
}));

const logger = {
  info: vi.fn(),
  error: vi.fn(),
};

function dueEmail(overrides: Record<string, unknown> = {}) {
  return {
    id: "scheduled-1",
    organizationId: "org-1",
    recipientEmail: "customer@example.com",
    recipientName: "Customer",
    customerId: "customer-1",
    templateType: "custom",
    templateData: {},
    subject: "Hello",
    userId: "user-1",
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

describe("scheduled email processing behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbState.updateReturnQueue = [];
    dbState.insertReturnQueue = [];
    dbState.updates = [];
    dbState.inserts = [];
    mockPrepareTracking.mockReturnValue({ html: "<p>Hello tracked</p>", linkMap: new Map() });
  });

  it("skips a due row when claim returns no processing row", async () => {
    mockDueEmails.mockResolvedValue([dueEmail()]);
    dbState.updateReturnQueue = [[]];

    const { processDueScheduledEmails } = await import(
      "@/server/functions/communications/_shared/scheduled-email-processing"
    );

    await expect(processDueScheduledEmails({ logger })).resolves.toEqual({
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 1,
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("finalizes suppressed recipients as cancelled without sending", async () => {
    const row = dueEmail();
    mockDueEmails.mockResolvedValue([row]);
    dbState.updateReturnQueue = [[row]];
    mockSuppression.mockResolvedValue({ suppressed: true, reason: "unsubscribe" });

    const { processDueScheduledEmails } = await import(
      "@/server/functions/communications/_shared/scheduled-email-processing"
    );

    await expect(processDueScheduledEmails({ logger })).resolves.toMatchObject({
      processed: 1,
      skipped: 1,
    });
    expect(mockSend).not.toHaveBeenCalled();
    expect(dbState.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "cancelled",
          cancelReason: "Suppressed: unsubscribe",
        }),
      ]),
    );
  });

  it("persists failed attempt metadata when rendering fails", async () => {
    const row = dueEmail();
    mockDueEmails.mockResolvedValue([row]);
    dbState.updateReturnQueue = [[row]];
    mockSuppression.mockResolvedValue({ suppressed: false });
    mockRender.mockRejectedValue(new MockTemplateUnresolvedError("Missing template"));

    const { processDueScheduledEmails } = await import(
      "@/server/functions/communications/_shared/scheduled-email-processing"
    );

    await expect(processDueScheduledEmails({ logger })).resolves.toMatchObject({
      processed: 1,
      failed: 1,
    });
    expect(dbState.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "failed",
          lastError: "Missing template",
        }),
      ]),
    );
  });

  it("links sent rows to email history after provider success", async () => {
    const row = dueEmail();
    mockDueEmails.mockResolvedValue([row]);
    dbState.updateReturnQueue = [[row]];
    dbState.insertReturnQueue = [[{ id: "email-1" }]];
    mockSuppression.mockResolvedValue({ suppressed: false });
    mockRender.mockResolvedValue(renderedEmail());
    mockSend.mockResolvedValue({ data: { id: "resend-1" }, error: null });
    mockMarkSent.mockResolvedValue(undefined);

    const { processDueScheduledEmails } = await import(
      "@/server/functions/communications/_shared/scheduled-email-processing"
    );

    await expect(processDueScheduledEmails({ logger })).resolves.toMatchObject({
      processed: 1,
      sent: 1,
    });
    expect(mockMarkSent).toHaveBeenCalledWith({
      scheduledEmailId: "scheduled-1",
      emailHistoryId: "email-1",
      organizationId: "org-1",
    });
    expect(mockActivity).toHaveBeenCalledWith(expect.objectContaining({ emailId: "email-1" }));
  });
});
