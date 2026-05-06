import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatResendConfirmationError,
  isUnsafeResendConfirmationMessage,
} from '@/hooks/auth/resend-confirmation-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('resend confirmation feedback', () => {
  it('keeps safe rate-limit copy and suppresses auth provider internals', () => {
    expect(
      formatResendConfirmationError(
        'Too many resend requests. Please try again in 5 minutes.',
        300
      )
    ).toBe('Too many resend requests. Please try again in 5 minutes.');

    expect(formatResendConfirmationError(undefined, 121)).toBe(
      'Too many resend requests. Please try again in 3 minutes.'
    );

    expect(
      formatResendConfirmationError(
        new Error('AuthApiError: supabase refresh token stack trace while resending confirmation')
      )
    ).toBe('Confirmation email is temporarily unavailable. Please try again.');

    expect(
      formatResendConfirmationError(
        'TypeError: Cannot read properties of undefined (reading confirmationToken)',
        60
      )
    ).toBe('Too many resend requests. Please try again in 1 minute.');

    expect(isUnsafeResendConfirmationMessage('JWT access token leaked in provider stack')).toBe(true);
  });

  it('keeps resend hook and success card behind auth-owned feedback helpers', () => {
    const index = read('src/hooks/auth/index.ts');
    const hook = read('src/hooks/auth/use-resend-confirmation.ts');
    const card = read('src/components/auth/sign-up-success-card.tsx');

    expect(index).toContain('formatResendConfirmationError');
    expect(index).toContain('isUnsafeResendConfirmationMessage');

    expect(hook).toContain('throw new Error(formatResendConfirmationError(error))');
    expect(hook).toContain('formatResendConfirmationError(result.error, result.retryAfter)');

    expect(card).toContain(
      'formatResendConfirmationError(mutationData.error, mutationData.retryAfter)'
    );
    expect(card).toContain('formatResendConfirmationError(resendMutation.error)');
    expect(card).not.toContain('resendMutation.error.message');
    expect(card).not.toContain("Failed to send confirmation email. Please try again.");
    expect(card).not.toContain('Try again in ${Math.ceil(mutationData.retryAfter / 60)} minutes.');
  });
});
