import { describe, expect, it } from 'vitest';
import { isAllowedExternalRedirect, sanitizeInternalRedirect } from '@/lib/auth/redirects';

describe('sanitizeInternalRedirect', () => {
  it('keeps safe in-app paths', () => {
    const value = sanitizeInternalRedirect('/dashboard?tab=home', { fallback: '/login' });
    expect(value).toBe('/dashboard?tab=home');
  });

  it('rejects protocol-relative and absolute redirect attempts', () => {
    expect(sanitizeInternalRedirect('//evil.com', { fallback: '/dashboard' })).toBe('/dashboard');
    expect(sanitizeInternalRedirect('https://evil.com', { fallback: '/dashboard' })).toBe('/dashboard');
  });

  it('rejects disallowed paths', () => {
    const value = sanitizeInternalRedirect('/login', {
      fallback: '/dashboard',
      disallowPaths: ['/login'],
    });
    expect(value).toBe('/dashboard');
  });
});

describe('isAllowedExternalRedirect', () => {
  it('allows same-origin exact and nested paths from allowlist', () => {
    const allowlist = ['https://app.example.com/integrations/oauth'];
    expect(
      isAllowedExternalRedirect('https://app.example.com/integrations/oauth', { allowlist })
    ).toBe(true);
    expect(
      isAllowedExternalRedirect('https://app.example.com/integrations/oauth/success', { allowlist })
    ).toBe(true);
  });

  it('rejects lookalike prefix domains and non-https in production', () => {
    const allowlist = ['https://app.example.com/integrations/oauth'];
    expect(
      isAllowedExternalRedirect('https://app.example.com.evil.org/integrations/oauth', {
        allowlist,
        nodeEnv: 'production',
      })
    ).toBe(false);

    expect(
      isAllowedExternalRedirect('http://app.example.com/integrations/oauth', {
        allowlist,
        nodeEnv: 'production',
      })
    ).toBe(false);
  });

  it('fails closed in production when allowlist is empty', () => {
    expect(
      isAllowedExternalRedirect('https://app.example.com/integrations/oauth', {
        allowlist: [],
        nodeEnv: 'production',
      })
    ).toBe(false);
  });
});
