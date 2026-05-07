import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_DEBUG_RLS_ERROR_MESSAGE } from '@/lib/ai/api-error-responses';

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

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
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
