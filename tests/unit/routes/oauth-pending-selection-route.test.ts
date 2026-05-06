import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithAuth = vi.fn();
const mockGetPendingXeroTenantSelection = vi.fn();
const mockCompletePendingXeroTenantSelection = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {},
}));

vi.mock('@/lib/server/protected', () => ({
  withAuth: (...args: unknown[]) => mockWithAuth(...args),
}));

vi.mock('@/lib/oauth/flow', () => ({
  getPendingXeroTenantSelection: (...args: unknown[]) => mockGetPendingXeroTenantSelection(...args),
  completePendingXeroTenantSelection: (...args: unknown[]) =>
    mockCompletePendingXeroTenantSelection(...args),
}));

describe('oauth pending selection route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithAuth.mockResolvedValue({
      user: { id: 'user-1' },
      organizationId: 'org-1',
    });
  });

  it('returns available Xero tenant choices for an authenticated state owner', async () => {
    mockGetPendingXeroTenantSelection.mockResolvedValue({
      stateId: '11111111-1111-4111-8111-111111111111',
      redirectUrl: 'http://localhost/integrations/oauth',
      tenants: [{ tenantId: 'tenant-1', tenantType: 'ORGANISATION' }],
    });

    const { GET } = await import('@/routes/api/oauth/pending-selection');
    const response = await GET({
      request: new Request(
        'http://localhost/api/oauth/pending-selection?stateId=11111111-1111-4111-8111-111111111111'
      ),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      stateId: '11111111-1111-4111-8111-111111111111',
      redirectUrl: 'http://localhost/integrations/oauth',
      tenants: [{ tenantId: 'tenant-1', tenantType: 'ORGANISATION' }],
    });
  });

  it('keeps pending tenant lookup failures operator-safe', async () => {
    mockGetPendingXeroTenantSelection.mockRejectedValue(
      new Error('duplicate key violates oauth_state access_token constraint')
    );

    const { GET } = await import('@/routes/api/oauth/pending-selection');
    const response = await GET({
      request: new Request(
        'http://localhost/api/oauth/pending-selection?stateId=11111111-1111-4111-8111-111111111111'
      ),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Xero tenant choices are temporarily unavailable. Please reconnect Xero and try again.',
    });
  });

  it('completes tenant selection and connection creation', async () => {
    mockCompletePendingXeroTenantSelection.mockResolvedValue({
      success: true,
      connectionIds: ['connection-1'],
      provider: 'xero',
      services: ['accounting'],
      organizationId: 'org-1',
      userId: 'user-1',
      redirectUrl: 'http://localhost/integrations/oauth',
    });

    const { POST } = await import('@/routes/api/oauth/pending-selection');
    const response = await POST({
      request: new Request('http://localhost/api/oauth/pending-selection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          stateId: '11111111-1111-4111-8111-111111111111',
          tenantId: 'tenant-1',
        }),
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      connectionIds: ['connection-1'],
      provider: 'xero',
      services: ['accounting'],
      organizationId: 'org-1',
      userId: 'user-1',
      redirectUrl: 'http://localhost/integrations/oauth',
    });
  });

  it('keeps tenant completion failures operator-safe', async () => {
    mockCompletePendingXeroTenantSelection.mockRejectedValue(
      new Error('Xero tenant id tenant-1 failed with provider_token stack')
    );

    const { POST } = await import('@/routes/api/oauth/pending-selection');
    const response = await POST({
      request: new Request('http://localhost/api/oauth/pending-selection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          stateId: '11111111-1111-4111-8111-111111111111',
          tenantId: 'tenant-1',
        }),
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Xero tenant connection is temporarily unavailable. Please try again.',
    });
  });
});
