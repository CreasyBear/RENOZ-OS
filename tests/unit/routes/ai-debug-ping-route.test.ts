import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AI_DEBUG_ROUTE_DISABLED_MESSAGE } from '@/lib/ai/debug-route-policy';

describe('ai debug ping route', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDebugRoutesEnabled = process.env.AI_DEBUG_ROUTES_ENABLED;

  beforeEach(() => {
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

    const { GET } = await import('@/routes/api/ai/debug-ping');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      ok: false,
      error: AI_DEBUG_ROUTE_DISABLED_MESSAGE,
    });
  });

  it('stays disabled in production even when debug routes are explicitly enabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AI_DEBUG_ROUTES_ENABLED = 'true';

    const { GET } = await import('@/routes/api/ai/debug-ping');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      ok: false,
      error: AI_DEBUG_ROUTE_DISABLED_MESSAGE,
    });
  });

  it('responds only when non-production debug routes are explicitly enabled', async () => {
    const { GET } = await import('@/routes/api/ai/debug-ping');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, message: 'API route works' });
  });
});
