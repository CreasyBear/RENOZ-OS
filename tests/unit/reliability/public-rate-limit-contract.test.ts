import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function source(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('public endpoint rate-limit contract', () => {
  it('uses a distributed backend for shared public endpoint throttling', () => {
    const helper = source('src/lib/server/rate-limit.ts');

    expect(helper).toContain("from '@upstash/ratelimit'");
    expect(helper).toContain("from '@upstash/redis'");
    expect(helper).toContain('export async function checkRateLimitResult');
    expect(helper).toContain('export async function checkRateLimit');
    expect(helper).toContain("prefix: `ratelimit:public:${namespace}:`");
    expect(helper).toContain("process.env.NODE_ENV === 'production'");
    expect(helper).toContain("return 'unknown-client'");
    expect(helper).not.toContain("return 'default-client'");
  });

  it('keeps public HTML/API routes on the async result helper', () => {
    const unsubscribe = source('src/routes/api/unsubscribe.$token.ts');
    const resend = source('src/routes/api/webhooks/resend.ts');

    for (const route of [unsubscribe, resend]) {
      expect(route).toContain('checkRateLimitResult');
      expect(route).toContain('await checkRateLimitResult');
      expect(route).not.toContain('checkRateLimitSync');
    }
  });

  it('awaits throwing public rate-limit checks in server functions and routes', () => {
    const expectedCalls = [
      ['src/routes/api/oauth/initiate.ts', "await checkRateLimit('oauth-initiate'"],
      ['src/routes/portal/confirm.ts', "await checkRateLimit('auth-confirm-portal'"],
      ['src/server/functions/auth/confirm.ts', "await checkRateLimit('auth-confirm-email'"],
      ['src/server/functions/portal/portal-auth.ts', "await checkRateLimit('portal-link-request'"],
      ['src/server/functions/users/invitations.ts', "await checkRateLimit('invitation-lookup'"],
      ['src/server/functions/users/invitations.ts', "await checkRateLimit('invitation-accept'"],
    ] as const;

    for (const [path, call] of expectedCalls) {
      expect(source(path)).toContain(call);
    }
  });
});
