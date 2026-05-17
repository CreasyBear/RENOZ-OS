import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const warn = vi.fn();

const originalNodeEnv = process.env.NODE_ENV;
const originalVitest = process.env.VITEST;
const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

describe('auth rate-limit runtime logging', () => {
  beforeEach(() => {
    vi.resetModules();
    warn.mockReset();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    vi.doMock('@/lib/logger', () => ({
      logger: {
        warn,
      },
    }));
  });

  afterEach(() => {
    vi.doUnmock('@/lib/logger');
    process.env.NODE_ENV = originalNodeEnv;
    process.env.VITEST = originalVitest;

    if (originalUpstashUrl === undefined) {
      delete process.env.UPSTASH_REDIS_REST_URL;
    } else {
      process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
    }

    if (originalUpstashToken === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;
    }
  });

  it('keeps missing Upstash configuration quiet under the test runtime', async () => {
    process.env.NODE_ENV = 'test';
    process.env.VITEST = 'true';

    await import('@/lib/auth/rate-limit');

    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('UPSTASH'));
  });

  it('still warns outside the test runtime when Upstash is not configured', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.VITEST;

    await import('@/lib/auth/rate-limit');

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('UPSTASH'));
  });
});
