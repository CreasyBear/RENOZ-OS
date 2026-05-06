import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatPasswordChangeError,
  isUnsafePasswordChangeMessage,
} from '@/hooks/auth/password-change-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('password change feedback', () => {
  it('keeps safe password guidance and suppresses auth provider internals', () => {
    expect(formatPasswordChangeError('Current password is incorrect')).toBe(
      'Current password is incorrect'
    );

    expect(formatPasswordChangeError('Not authenticated')).toBe(
      'Your session has expired. Sign in again before changing your password.'
    );

    expect(formatPasswordChangeError('Too many login attempts. Please try again in 5 minutes.')).toBe(
      'Too many login attempts. Please try again in 5 minutes.'
    );

    expect(
      formatPasswordChangeError(
        'AuthApiError: supabase refresh token stack trace while updating password'
      )
    ).toBe('Password change is temporarily unavailable. Please refresh and try again.');

    expect(
      formatPasswordChangeError(
        new Error('TypeError: Cannot read properties of undefined (reading session)')
      )
    ).toBe('Password change is temporarily unavailable. Please refresh and try again.');

    expect(isUnsafePasswordChangeMessage('JWT access token leaked in provider stack')).toBe(true);
  });

  it('normalizes password-change hook errors before toast or mutation.error consumers can read them', () => {
    const hook = read('src/hooks/use-change-password.ts');
    const index = read('src/hooks/auth/index.ts');
    const form = read('src/components/auth/password-change-form.tsx');

    expect(index).toContain('formatPasswordChangeError');
    expect(index).toContain('isUnsafePasswordChangeMessage');

    expect(hook).toContain('throw new Error(formatPasswordChangeError(error))');
    expect(hook).toContain('throw new Error(formatPasswordChangeError(result.error))');
    expect(hook).toContain('toast.error(formatPasswordChangeError(error))');
    expect(hook).not.toContain('throw new Error(result.error || "Failed to change password")');
    expect(hook).not.toContain('toast.error(error.message || "Failed to change password")');

    expect(form).toContain('catch {');
    expect(form).toContain('// Error handled by mutation');
    expect(form).not.toContain('err instanceof Error ? err.message');
    expect(form).not.toContain('error.message || "Failed to change password"');
  });
});
