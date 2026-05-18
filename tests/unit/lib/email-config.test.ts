import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('email config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts RESEND_FROM_EMAIL as a formatted sender alias', async () => {
    vi.stubEnv('RESEND_FROM_EMAIL', 'RENOZ <noreply@renoz.energy>');

    const { getEmailFrom, getEmailFromName } = await import('@/lib/email/config');

    expect(getEmailFrom()).toBe('noreply@renoz.energy');
    expect(getEmailFromName()).toBe('RENOZ');
  });

  it('keeps EMAIL_FROM and EMAIL_FROM_NAME precedence over the Resend alias', async () => {
    vi.stubEnv('RESEND_FROM_EMAIL', 'RENOZ <noreply@renoz.energy>');
    vi.stubEnv('EMAIL_FROM', 'ops@example.com');
    vi.stubEnv('EMAIL_FROM_NAME', 'Ops');

    const { getEmailFrom, getEmailFromName } = await import('@/lib/email/config');

    expect(getEmailFrom()).toBe('ops@example.com');
    expect(getEmailFromName()).toBe('Ops');
  });
});
