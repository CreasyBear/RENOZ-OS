import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatLoginError, isUnsafeLoginMessage } from '@/hooks/auth/login-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('login feedback', () => {
  it('keeps safe sign-in guidance and suppresses auth provider internals', () => {
    expect(formatLoginError('Invalid login credentials')).toBe('Invalid email or password.');
    expect(formatLoginError('Email not confirmed')).toBe(
      'Please confirm your email before signing in.'
    );
    expect(formatLoginError('Too many login attempts. Please try again in 4 minutes.')).toBe(
      'Too many login attempts. Please try again in 4 minutes.'
    );
    expect(formatLoginError('Login succeeded but no session was found.')).toBe(
      'Session check failed. Please sign in again.'
    );
    expect(formatLoginError('Account setup is incomplete. Please contact support.')).toBe(
      'Account setup is incomplete. Please contact support.'
    );

    expect(
      formatLoginError(new Error('AuthApiError: supabase refresh token stack trace during login'))
    ).toBe('Sign in is temporarily unavailable. Please try again.');
    expect(
      formatLoginError('TypeError: Cannot read properties of undefined (reading session)')
    ).toBe('Sign in is temporarily unavailable. Please try again.');
    expect(isUnsafeLoginMessage('JWT access token leaked in provider stack')).toBe(true);
  });

  it('keeps login form behind auth-owned feedback helpers', () => {
    const index = read('src/hooks/auth/index.ts');
    const helper = read('src/hooks/auth/login-error-messages.ts');
    const form = read('src/components/auth/login-form.tsx');

    expect(index).toContain('formatLoginError');
    expect(index).toContain('isUnsafeLoginMessage');
    expect(helper).toContain('formatLoginError');

    expect(form).toContain('throw new Error(formatLoginError(loginRateLimit.error))');
    expect(form).toContain('throw new Error(formatLoginError(error))');
    expect(form).toContain(
      "throw new Error(formatLoginError('Login succeeded but no session was found.'))"
    );
    expect(form).toContain(
      "throw new Error(formatLoginError('Account setup is incomplete. Please contact support.'))"
    );
    expect(form).toContain('setAuthError(formatLoginError(err))');
    expect(form).not.toContain(
      "setAuthError(err instanceof Error ? err.message : 'An error occurred')"
    );
    expect(form).not.toContain('if (error) throw error');
    expect(form).not.toContain('throw new Error(\\n        (typeof loginRateLimit.error');
    expect(form).not.toContain('Account setup is incomplete. Please sign up again or contact support.');
  });
});
