import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatPasswordResetRequestError,
  isUnsafePasswordResetMessage,
} from '@/hooks/auth/password-reset-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('password reset request feedback', () => {
  it('keeps safe rate-limit copy and suppresses auth provider internals', () => {
    expect(
      formatPasswordResetRequestError(
        'Too many password reset requests. Please try again in 2 hours.',
        7200
      )
    ).toBe('Too many password reset requests. Please try again in 2 hours.');

    expect(formatPasswordResetRequestError(undefined, 1800)).toBe(
      'Too many password reset requests. Please try again in 1 hour.'
    );

    expect(
      formatPasswordResetRequestError(
        new Error('AuthApiError: supabase refresh token stack trace while requesting reset')
      )
    ).toBe('Password reset is temporarily unavailable. Please try again.');

    expect(
      formatPasswordResetRequestError(
        'TypeError: Cannot read properties of undefined (reading redirectTo)',
        3600
      )
    ).toBe('Too many password reset requests. Please try again in 1 hour.');

    expect(isUnsafePasswordResetMessage('JWT access token leaked in provider stack')).toBe(true);
  });

  it('keeps password-reset request hook and form behind auth-owned feedback helpers', () => {
    const index = read('src/hooks/auth/index.ts');
    const hook = read('src/hooks/auth/use-password-reset.ts');
    const form = read('src/components/auth/forgot-password-form.tsx');

    expect(index).toContain('formatPasswordResetRequestError');
    expect(index).toContain('isUnsafePasswordResetMessage');

    expect(hook).toContain('throw new Error(formatPasswordResetRequestError(error))');
    expect(hook).toContain('formatPasswordResetRequestError(result.error, result.retryAfter)');
    expect(hook).toContain('throw new Error(formatPasswordResetRequestError(error))');
    expect(hook).not.toContain(
      "throw new Error('Password reset is temporarily unavailable. Please try again shortly.')"
    );

    expect(form).toContain('formatPasswordResetRequestError(result.error, result.retryAfter)');
    expect(form).toContain('setSubmitError(formatPasswordResetRequestError(error))');
    expect(form).not.toContain("throw new Error(result.error ?? 'Failed to send password reset email.')");
    expect(form).not.toContain(
      "setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred.')"
    );
  });
});
