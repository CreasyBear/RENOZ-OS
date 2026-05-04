import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit }));
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockInsertValues = vi.fn();
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockAddSuppressionDirect = vi.fn();
const mockCheckRateLimitSync = vi.fn();
const mockGetClientIdentifier = vi.fn();
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  db: {
    select: () => mockSelect(),
    update: () => mockUpdate(),
    insert: () => mockInsert(),
  },
}));

vi.mock("@/server/functions/communications/_shared/suppression-mutations", () => ({
  addSuppressionDirect: (...args: unknown[]) => mockAddSuppressionDirect(...args),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimitSync: (...args: unknown[]) => mockCheckRateLimitSync(...args),
  getClientIdentifier: (...args: unknown[]) => mockGetClientIdentifier(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: mockLogger,
}));

const baseContact = {
  id: "contact-123",
  customerId: "customer-123",
  organizationId: "org-123",
  firstName: "Avery",
  lastName: "Stone",
  email: "avery@example.com",
  emailOptIn: true,
  smsOptIn: true,
};

function createExpiredSignedToken() {
  const payload = JSON.stringify({
    contactId: "contact-123",
    email: "avery@example.com",
    channel: "email",
    organizationId: "org-123",
    exp: Math.floor(Date.now() / 1000) - 3600,
  });
  const signature = createHmac("sha256", process.env.UNSUBSCRIBE_HMAC_SECRET!)
    .update(payload)
    .digest("hex")
    .slice(0, 16);

  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

function createLegacyToken() {
  return Buffer.from(
    JSON.stringify({ contactId: "contact-123", channel: "email" }),
  ).toString("base64url");
}

describe("unsubscribe route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.UNSUBSCRIBE_HMAC_SECRET = "test-unsubscribe-secret-1234567890";
    mockGetClientIdentifier.mockReturnValue("client-123");
    mockCheckRateLimitSync.mockReturnValue({
      allowed: true,
      retryAfterMs: 0,
      resetAt: new Date("2026-04-17T00:00:00.000Z"),
    });
    mockSelectLimit.mockResolvedValue([baseContact]);
    mockUpdateWhere.mockResolvedValue(undefined);
    mockInsertValues.mockResolvedValue(undefined);
    mockAddSuppressionDirect.mockResolvedValue(undefined);
  });

  it("shows the confirmation page for a valid signed token", async () => {
    const { generateUnsubscribeToken } = await import("@/lib/server/unsubscribe-tokens");
    const { GET } = await import("@/routes/api/unsubscribe.$token");

    const token = generateUnsubscribeToken({
      contactId: baseContact.id,
      email: baseContact.email,
      channel: "email",
      organizationId: baseContact.organizationId,
      emailId: "email-123",
    });

    const response = await GET({
      params: { token },
      request: new Request("http://localhost/api/unsubscribe/test"),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("Unsubscribe from email");
    expect(mockSelectLimit).toHaveBeenCalledTimes(1);
  });

  it("processes unsubscribe for a valid signed token", async () => {
    const { generateUnsubscribeToken } = await import("@/lib/server/unsubscribe-tokens");
    const { POST } = await import("@/routes/api/unsubscribe.$token");

    const token = generateUnsubscribeToken({
      contactId: baseContact.id,
      email: baseContact.email,
      channel: "email",
      organizationId: baseContact.organizationId,
      emailId: "email-123",
    });

    const response = await POST({
      params: { token },
      request: new Request("http://localhost/api/unsubscribe/test", {
        method: "POST",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("Unsubscribed Successfully");
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
    expect(mockAddSuppressionDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: baseContact.organizationId,
        email: baseContact.email,
        reason: "unsubscribe",
      }),
    );
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed tokens", async () => {
    const { GET } = await import("@/routes/api/unsubscribe.$token");

    const response = await GET({
      params: { token: "not-a-valid-token" },
      request: new Request("http://localhost/api/unsubscribe/test"),
    });

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain("invalid or has expired");
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("rejects expired signed tokens", async () => {
    const { GET } = await import("@/routes/api/unsubscribe.$token");

    const response = await GET({
      params: { token: createExpiredSignedToken() },
      request: new Request("http://localhost/api/unsubscribe/test"),
    });

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain("invalid or has expired");
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("rejects legacy unsigned tokens", async () => {
    const { GET } = await import("@/routes/api/unsubscribe.$token");

    const response = await GET({
      params: { token: createLegacyToken() },
      request: new Request("http://localhost/api/unsubscribe/test"),
    });

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain("invalid or has expired");
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
