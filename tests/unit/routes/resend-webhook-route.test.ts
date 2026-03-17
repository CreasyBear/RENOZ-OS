import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVerify = vi.fn();
const mockSendEvent = vi.fn();
const mockCheckRateLimitSync = vi.fn();
const mockGetClientIdentifier = vi.fn();
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    webhooks: {
      verify: (...args: unknown[]) => mockVerify(...args),
    },
  })),
}));

vi.mock("@/trigger/client", () => ({
  client: {
    sendEvent: (...args: unknown[]) => mockSendEvent(...args),
  },
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimitSync: (...args: unknown[]) => mockCheckRateLimitSync(...args),
  getClientIdentifier: (...args: unknown[]) => mockGetClientIdentifier(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: mockLogger,
}));

describe("resend webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = "secret";
    process.env.RESEND_API_KEY = "api-key";

    mockGetClientIdentifier.mockReturnValue("client-123");
    mockCheckRateLimitSync.mockReturnValue({
      allowed: true,
      retryAfterMs: 0,
      resetAt: new Date("2026-03-15T00:00:00.000Z"),
    });
    mockVerify.mockReturnValue({
      type: "email.delivered",
      created_at: "2026-03-15T00:00:00.000Z",
      data: {
        email_id: "email-123",
        from: "from@example.com",
        to: ["to@example.com"],
      },
    });
  });

  it("returns 503 when Trigger handoff fails so the webhook can be retried", async () => {
    mockSendEvent.mockRejectedValue(new Error("trigger unavailable"));

    const { POST } = await import("@/routes/api/webhooks/resend");

    const response = await POST({
      request: new Request("http://localhost/api/webhooks/resend", {
        method: "POST",
        body: JSON.stringify({ ok: true }),
        headers: {
          "content-type": "application/json",
          "svix-id": "msg_123",
          "svix-timestamp": "1234567890",
          "svix-signature": "sig_123",
        },
      }),
    });

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("60");
    await expect(response.json()).resolves.toEqual({
      error: "Webhook processing unavailable",
    });
    expect(mockSendEvent).toHaveBeenCalledWith({
      name: "resend.webhook.received",
      payload: expect.objectContaining({
        event: expect.objectContaining({
          type: "email.delivered",
        }),
      }),
    });
  });
});
