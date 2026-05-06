import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithAuth = vi.fn();
const mockDb = {
  select: vi.fn(),
};

vi.mock('@/lib/server/protected', () => ({
  withAuth: (...args: unknown[]) => mockWithAuth(...args),
}));

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

function makeWhereChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
    }),
  };
}

function makeRecentActivityChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(rows),
          }),
        }),
      }),
    }),
  };
}

describe('oauth dashboard route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithAuth.mockResolvedValue({
      organizationId: 'org-1',
      user: { id: 'user-1' },
    });
  });

  it('returns safe recent activity copy for stored sync-log errors', async () => {
    mockDb.select
      .mockReturnValueOnce(makeWhereChain([{ totalConnections: 1, healthyConnections: 1 }]))
      .mockReturnValueOnce(makeWhereChain([{ totalSyncsToday: 2, failedSyncsToday: 1, avgDurationMs: 1200 }]))
      .mockReturnValueOnce(
        makeRecentActivityChain([
          {
            id: 'sync-log-1',
            createdAt: new Date('2026-05-06T01:00:00.000Z'),
            serviceType: 'accounting',
            operation: 'token_refresh',
            status: 'failed',
            errorMessage: 'duplicate key violates oauth_sync_logs access_token_key',
            metadata: {
              providerToken: 'bearer access_token from provider',
              durationMs: 1200,
            },
            provider: 'xero',
          },
        ])
      );

    const { GET } = await import('@/routes/api/oauth/dashboard');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recentActivity).toEqual([
      expect.objectContaining({
        id: 'sync-log-1',
        status: 'error',
        description: 'Integration sync is temporarily unavailable. Please try again.',
        details: {
          providerToken: 'Hidden for safety',
          durationMs: '1200',
        },
      }),
    ]);
    expect(JSON.stringify(body)).not.toContain('duplicate key');
    expect(JSON.stringify(body)).not.toContain('access_token');
  });
});
