import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatSignUpError, isUnsafeSignUpMessage } from '@/hooks/auth/sign-up-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('sign-up feedback', () => {
  it('keeps safe account-creation guidance and suppresses auth provider internals', () => {
    expect(formatSignUpError('User already registered')).toBe(
      'This email may already have an account. Try signing in or resetting your password.'
    );
    expect(formatSignUpError('Email rate limit exceeded')).toBe(
      'Too many account creation attempts. Please wait before trying again.'
    );
    expect(formatSignUpError('Password should be at least 8 characters')).toBe(
      'Please choose a stronger password.'
    );

    expect(
      formatSignUpError(new Error('AuthApiError: supabase refresh token stack trace during signup'))
    ).toBe('Account creation is temporarily unavailable. Please try again.');
    expect(
      formatSignUpError('TypeError: Cannot read properties of undefined (reading user)')
    ).toBe('Account creation is temporarily unavailable. Please try again.');
    expect(isUnsafeSignUpMessage('JWT access token leaked in provider stack')).toBe(true);
  });

  it('keeps sign-up form behind auth-owned feedback helpers', () => {
    const index = read('src/hooks/auth/index.ts');
    const form = read('src/components/auth/sign-up-form.tsx');

    expect(index).toContain('formatSignUpError');
    expect(index).toContain('isUnsafeSignUpMessage');

    expect(form).toContain('throw new Error(formatSignUpError(error))');
    expect(form).toContain('setAuthError(formatSignUpError(err))');
    expect(form).not.toContain('if (error) throw error');
    expect(form).not.toContain("setAuthError(err instanceof Error ? err.message : 'An error occurred')");
  });

  it('keeps shared auth-provider safety checks centralized', () => {
    const utility = read('src/hooks/auth/auth-error-message-utils.ts');
    const formatterPaths = [
      'src/hooks/auth/login-error-messages.ts',
      'src/hooks/auth/password-change-error-messages.ts',
      'src/hooks/auth/password-reset-error-messages.ts',
      'src/hooks/auth/resend-confirmation-error-messages.ts',
      'src/hooks/auth/sign-up-error-messages.ts',
    ];

    expect(utility).toContain('extractAuthErrorMessage');
    expect(utility).toContain('isUnsafeAuthProviderMessage');

    for (const path of formatterPaths) {
      const source = read(path);
      expect(source).toContain("from './auth-error-message-utils'");
      expect(source).not.toContain('function extractMessage');
      expect(source).not.toContain("normalized.includes('api key')");
    }
  });
});
