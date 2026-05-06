import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockHandleOAuthCallback = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {},
}));

vi.mock('@/lib/oauth/flow', () => ({
  handleOAuthCallback: (...args: unknown[]) => mockHandleOAuthCallback(...args),
}));

vi.mock('@/lib/oauth/oauth-error-messages', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/oauth/oauth-error-messages')>();
  return {
    ...actual,
    toOAuthConnectionErrorCode: (code: string) => code.toLowerCase(),
  };
});

describe('oauth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to tenant selection when Xero requires an explicit tenant choice', async () => {
    mockHandleOAuthCallback.mockResolvedValue({
      success: false,
      error: 'TENANT_SELECTION_REQUIRED',
      redirectUrl: 'http://localhost/integrations/oauth',
      stateId: '11111111-1111-4111-8111-111111111111',
      provider: 'xero',
      tenants: [
        { tenantId: 'tenant-1', tenantType: 'ORGANISATION' },
        { tenantId: 'tenant-2', tenantType: 'ORGANISATION' },
      ],
    });

    const { GET } = await import('@/routes/api/oauth/callback');
    const response = await GET({
      request: new Request(
        'http://localhost/api/oauth/callback?code=abc&state=encrypted-state'
      ),
    });

    expect(response.status).toBe(302);
    const location = response.headers.get('Location');
    expect(location).toContain('/integrations/oauth');
    expect(location).toContain('oauth=select_tenant');
    expect(location).toContain('oauthStateId=11111111-1111-4111-8111-111111111111');
    expect(location).toContain('provider=xero');
  });

  it('redirects failed callbacks with oauth-owned error codes', async () => {
    mockHandleOAuthCallback.mockResolvedValue({
      success: false,
      error: 'INVALID_STATE',
      errorDescription: 'oauth state not found for stateId secret',
    });

    const { GET } = await import('@/routes/api/oauth/callback');
    const response = await GET({
      request: new Request(
        'http://localhost/api/oauth/callback?code=abc&state=encrypted-state'
      ),
    });

    expect(response.status).toBe(302);
    const location = response.headers.get('Location');
    expect(location).toContain('/integrations/oauth');
    expect(location).toContain('oauth=failed');
    expect(location).toContain('error=invalid_state');
    expect(location).not.toContain('stateId');
    expect(location).not.toContain('oauth+state');
  });
});
