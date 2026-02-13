import { afterEach, describe, expect, it } from 'vitest';
import {
  getClientIdentifier as getAuthClientIdentifier,
} from '@/lib/auth/rate-limit';
import {
  getClientIdentifier as getServerClientIdentifier,
} from '@/lib/server/rate-limit';

describe('client identifier trust model', () => {
  afterEach(() => {
    delete process.env.TRUST_PROXY;
  });

  it('ignores forwarded headers when TRUST_PROXY is false', () => {
    const request = new Request('https://app.example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.10',
        'x-real-ip': '203.0.113.11',
      },
    });

    expect(getAuthClientIdentifier(request)).toBe('unknown-client');
    expect(getServerClientIdentifier(request)).toBe('default-client');
  });

  it('accepts forwarded headers when TRUST_PROXY is true', () => {
    process.env.TRUST_PROXY = 'true';
    const request = new Request('https://app.example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.2',
      },
    });

    expect(getAuthClientIdentifier(request)).toBe('203.0.113.10');
    expect(getServerClientIdentifier(request)).toBe('203.0.113.10');
  });
});
