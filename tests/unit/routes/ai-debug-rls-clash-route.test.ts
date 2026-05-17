import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_DEBUG_RLS_ERROR_MESSAGE } from '@/lib/ai/api-error-responses';
import { AI_DEBUG_ROUTE_DISABLED_MESSAGE } from '@/lib/ai/debug-route-policy';

const mockDb = {
  execute: vi.fn(),
  select: vi.fn(),
};

const mockLogger = {
  error: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

describe('ai debug rls clash route', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDebugRoutesEnabled = process.env.AI_DEBUG_ROUTES_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
    process.env.AI_DEBUG_ROUTES_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalDebugRoutesEnabled === undefined) {
      delete process.env.AI_DEBUG_ROUTES_ENABLED;
    } else {
      process.env.AI_DEBUG_ROUTES_ENABLED = originalDebugRoutesEnabled;
    }
  });

  it('stays disabled unless debug routes are explicitly enabled', async () => {
    delete process.env.AI_DEBUG_ROUTES_ENABLED;

    const { GET } = await import('@/routes/api/ai/debug-rls-clash');

    const response = await GET({
      request: new Request('http://localhost/api/ai/debug-rls-clash?orgId=org-1'),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      ok: false,
      error: AI_DEBUG_ROUTE_DISABLED_MESSAGE,
    });
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('stays disabled in production even when debug routes are explicitly enabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AI_DEBUG_ROUTES_ENABLED = 'true';

    const { GET } = await import('@/routes/api/ai/debug-rls-clash');

    const response = await GET({
      request: new Request('http://localhost/api/ai/debug-rls-clash?orgId=org-1'),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      ok: false,
      error: AI_DEBUG_ROUTE_DISABLED_MESSAGE,
    });
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('returns safe diagnostic failure copy without leaking database internals', async () => {
    mockDb.execute.mockRejectedValueOnce(
      new Error('relation ai_api_keys exposed provider token in stack trace')
    );

    const { GET } = await import('@/routes/api/ai/debug-rls-clash');

    const response = await GET({
      request: new Request('http://localhost/api/ai/debug-rls-clash?orgId=org-1'),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: AI_DEBUG_RLS_ERROR_MESSAGE,
    });
    expect(JSON.stringify(body)).not.toContain('provider token');
    expect(JSON.stringify(body)).not.toContain('stack trace');
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[API /ai/debug-rls-clash] Error',
      expect.any(Error),
      {}
    );
  });
});
