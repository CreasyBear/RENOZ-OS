import { afterEach, describe, expect, it, vi } from "vitest";

const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockDb = {
  select: mockSelect,
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@/lib/oauth/token-encryption", () => ({
  decryptOAuthToken: vi.fn(() => "decrypted-token"),
}));

vi.mock("@/lib/oauth/token-refresh", () => ({
  refreshOAuthTokens: vi.fn(async () => ({ success: true, connectionId: "conn-1", attempts: 1 })),
}));

describe("xero adapter", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  function mockActiveConnection(connection?: {
    id: string;
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    externalAccountId: string | null;
  }) {
    mockLimit.mockResolvedValue(connection ? [connection] : []);
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
  }

  it("fails closed when Xero OAuth app credentials are missing", async () => {
    vi.stubEnv("XERO_CLIENT_ID", "");
    vi.stubEnv("XERO_CLIENT_SECRET", "");
    vi.stubEnv("XERO_REDIRECT_URI", "");

    const { getXeroSyncReadiness } = await import("@/server/functions/financial/xero-adapter");

    await expect(getXeroSyncReadiness("org-1")).resolves.toEqual({
      available: false,
      message: "Xero OAuth is not configured for this environment.",
    });
  });

  it("reports available when an org has an active Xero accounting connection", async () => {
    vi.stubEnv("XERO_CLIENT_ID", "client");
    vi.stubEnv("XERO_CLIENT_SECRET", "secret");
    vi.stubEnv("XERO_REDIRECT_URI", "https://example.com/callback");
    mockActiveConnection({
      id: "conn-1",
      accessToken: "encrypted-token",
      refreshToken: "encrypted-refresh",
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      externalAccountId: "tenant-1",
    });

    const { getXeroSyncReadiness } = await import("@/server/functions/financial/xero-adapter");

    await expect(getXeroSyncReadiness("org-1")).resolves.toEqual({
      available: true,
      connectionId: "conn-1",
    });
  });

  it("syncs manual journals and returns the real journal id", async () => {
    vi.stubEnv("XERO_CLIENT_ID", "client");
    vi.stubEnv("XERO_CLIENT_SECRET", "secret");
    vi.stubEnv("XERO_REDIRECT_URI", "https://example.com/callback");
    mockActiveConnection({
      id: "conn-1",
      accessToken: "encrypted-token",
      refreshToken: "encrypted-refresh",
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      externalAccountId: "tenant-1",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ManualJournals: [{ ManualJournalID: "journal-123" }],
      }),
    }) as typeof fetch;

    const { syncManualJournalWithXero } = await import("@/server/functions/financial/xero-adapter");

    await expect(
      syncManualJournalWithXero("org-1", {
        narration: "Recognition journal",
        reference: "REVREC-123",
        date: "2026-03-16",
        status: "POSTED",
        lineAmountTypes: "NoTax",
        journalLines: [
          {
            lineAmount: 1200,
            accountCode: "230",
            description: "Deferred revenue release",
          },
          {
            lineAmount: -1200,
            accountCode: "400",
            description: "Recognized revenue",
          },
        ],
      })
    ).resolves.toEqual({
      manualJournalId: "journal-123",
      rawResponse: {
        ManualJournals: [{ ManualJournalID: "journal-123" }],
      },
    });
  });

  it("classifies Xero validation errors for manual journals", async () => {
    vi.stubEnv("XERO_CLIENT_ID", "client");
    vi.stubEnv("XERO_CLIENT_SECRET", "secret");
    vi.stubEnv("XERO_REDIRECT_URI", "https://example.com/callback");
    mockActiveConnection({
      id: "conn-1",
      accessToken: "encrypted-token",
      refreshToken: "encrypted-refresh",
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      externalAccountId: "tenant-1",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      headers: new Headers(),
      json: async () => ({
        Elements: [{ ValidationErrors: [{ Message: "Account code is invalid" }] }],
      }),
    }) as typeof fetch;

    const { syncManualJournalWithXero, XeroAdapterError } = await import("@/server/functions/financial/xero-adapter");

    await expect(
      syncManualJournalWithXero("org-1", {
        narration: "Recognition journal",
        date: "2026-03-16",
        status: "POSTED",
        lineAmountTypes: "NoTax",
        journalLines: [
          {
            lineAmount: 1200,
            accountCode: "bad-code",
            description: "Deferred revenue release",
          },
          {
            lineAmount: -1200,
            accountCode: "400",
            description: "Recognized revenue",
          },
        ],
      })
    ).rejects.toEqual(
      new XeroAdapterError("validation_failed", "Account code is invalid", undefined, {
        Elements: [{ ValidationErrors: [{ Message: "Account code is invalid" }] }],
      })
    );
  });
});
