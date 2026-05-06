import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatPasswordResetCompletionError,
  isUnsafePasswordResetMessage,
} from '@/hooks/auth/password-reset-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('password reset completion feedback', () => {
  it('keeps safe password policy and session copy while suppressing provider internals', () => {
    expect(formatPasswordResetCompletionError('Password should be at least 8 characters.')).toBe(
      'Password should be at least 8 characters.'
    );

    expect(formatPasswordResetCompletionError('New password should be different from the old password.')).toBe(
      'New password should be different from the old password.'
    );

    expect(formatPasswordResetCompletionError('Auth session missing')).toBe(
      'This reset session has expired. Request a new password reset link and try again.'
    );

    expect(
      formatPasswordResetCompletionError(
        new Error('AuthApiError: supabase refresh token stack trace while updating password')
      )
    ).toBe('Password update is temporarily unavailable. Please refresh and try again.');

    expect(
      formatPasswordResetCompletionError(
        'TypeError: Cannot read properties of undefined (reading recoverySession)'
      )
    ).toBe('Password update is temporarily unavailable. Please refresh and try again.');

    expect(isUnsafePasswordResetMessage('JWT access token leaked in provider stack')).toBe(true);
  });

  it('keeps reset-password form behind auth-owned completion formatter', () => {
    const index = read('src/hooks/auth/index.ts');
    const helper = read('src/hooks/auth/password-reset-error-messages.ts');
    const form = read('src/components/auth/reset-password-form.tsx');

    expect(index).toContain('formatPasswordResetCompletionError');
    expect(helper).toContain('formatPasswordResetCompletionError');

    expect(form).toContain('throw new Error(formatPasswordResetCompletionError(error))');
    expect(form).toContain('setSubmitError(formatPasswordResetCompletionError(error))');
    expect(form).not.toContain('if (error) throw error');
    expect(form).not.toContain("setSubmitError(error instanceof Error ? error.message : 'An error occurred')");
  });
});
