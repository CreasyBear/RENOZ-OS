import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithAuth = vi.fn();
const mockInitiateOAuthFlow = vi.fn();
const mockCheckRateLimit = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {},
}));

vi.mock('@/lib/server/protected', () => ({
  withAuth: (...args: unknown[]) => mockWithAuth(...args),
}));

vi.mock('@/lib/oauth/flow', () => ({
  initiateOAuthFlow: (...args: unknown[]) => mockInitiateOAuthFlow(...args),
}));

vi.mock('@/lib/server/rate-limit', async () => {
  class RateLimitError extends Error {
    retryAfterMs: number;

    constructor(message: string, retryAfterMs: number) {
      super(message);
      this.retryAfterMs = retryAfterMs;
    }
  }

  return {
    checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
    getClientIdentifier: () => 'client-1',
    RATE_LIMITS: { publicAction: { limit: 5, windowMs: 60_000 } },
    RateLimitError,
  };
});

describe('oauth initiate route', () => {
  beforeEach(() => {
    mockWithAuth.mockReset();
    mockInitiateOAuthFlow.mockReset();
    mockCheckRateLimit.mockReset();
    mockWithAuth.mockResolvedValue({
      user: { id: 'user-1' },
      organizationId: 'org-1',
    });
    mockInitiateOAuthFlow.mockResolvedValue({
      authorizationUrl: 'https://provider.example/authorize',
      state: 'encrypted-state',
    });
  });

  it('starts an oauth flow for valid requests', async () => {
    const { POST } = await import('@/routes/api/oauth/initiate');
    const response = await POST({
      request: new Request('http://localhost/api/oauth/initiate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'xero',
          services: ['accounting'],
          redirectUrl: 'http://localhost/integrations/oauth',
        }),
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authorizationUrl: 'https://provider.example/authorize',
      state: 'encrypted-state',
    });
    expect(mockInitiateOAuthFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        userId: 'user-1',
        provider: 'xero',
        services: ['accounting'],
        redirectUrl: 'http://localhost/integrations/oauth',
      })
    );
  });

  it('returns safe copy for invalid request payloads without zod details', async () => {
    const { POST } = await import('@/routes/api/oauth/initiate');
    const response = await POST({
      request: new Request('http://localhost/api/oauth/initiate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'xero',
          services: [],
        }),
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Connection request is invalid. Choose a provider and service before trying again.',
    });
  });

  it('returns safe copy and retry-after for rate limits', async () => {
    const { RateLimitError } = await import('@/lib/server/rate-limit');
    mockCheckRateLimit.mockImplementation(() => {
      throw new RateLimitError('oauth-initiate clientId exceeded policy', 61_000);
    });

    const { POST } = await import('@/routes/api/oauth/initiate');
    const response = await POST({
      request: new Request('http://localhost/api/oauth/initiate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'xero',
          services: ['accounting'],
        }),
      }),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('61');
    await expect(response.json()).resolves.toEqual({
      error: 'Too many connection attempts. Please wait before trying again.',
    });
  });

  it('returns safe copy for redirect misconfiguration', async () => {
    mockInitiateOAuthFlow.mockRejectedValue(new Error('Redirect URL is not allowed'));

    const { POST } = await import('@/routes/api/oauth/initiate');
    const response = await POST({
      request: new Request('http://localhost/api/oauth/initiate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'xero',
          services: ['accounting'],
        }),
      }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Connection setup is misconfigured. Contact support before trying again.',
    });
  });

  it('returns fallback copy for unsafe provider and storage failures', async () => {
    mockInitiateOAuthFlow.mockRejectedValue(
      new Error('duplicate key violates oauth_states access_token constraint')
    );

    const { POST } = await import('@/routes/api/oauth/initiate');
    const response = await POST({
      request: new Request('http://localhost/api/oauth/initiate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'xero',
          services: ['accounting'],
        }),
      }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Connection setup is temporarily unavailable. Please try again.',
    });
  });
});
