import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatAuthCallbackError,
  isUnsafeAuthCallbackMessage,
} from '@/lib/auth/auth-callback-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('auth callback feedback', () => {
  it('keeps safe callback guidance and suppresses provider/session internals', () => {
    expect(
      formatAuthCallbackError(
        'invalid_request',
        'This reset link is invalid or expired. Please request a new one.'
      )
    ).toBe(
      'This reset link is invalid or expired. Please request a new one from the forgot password page.'
    );
    expect(formatAuthCallbackError('access_denied', 'User cancelled provider consent')).toBe(
      'Authentication was cancelled or denied. Please try again.'
    );
    expect(formatAuthCallbackError('invalid_request', 'Email link expired')).toBe(
      'This authentication link has expired. Please request a new link and try again.'
    );
    expect(formatAuthCallbackError('token_exchange_failed', 'Failed to establish session.')).toBe(
      'We could not finish verifying your session. Please try again.'
    );

    expect(
      formatAuthCallbackError(
        'token_exchange_failed',
        'AuthApiError: supabase refresh token stack from setSession'
      )
    ).toBe('We could not finish verifying your session. Please try again.');
    expect(
      formatAuthCallbackError(
        'invalid_request',
        'duplicate key violates auth_sessions access token constraint'
      )
    ).toBe('The authentication request was invalid. Please try again.');
    expect(isUnsafeAuthCallbackMessage('PKCE code verifier leaked with token_hash')).toBe(true);
  });

  it('keeps hash exchange and auth error route behind callback formatter copy', () => {
    const authRoute = read('src/routes/auth/error.tsx');
    const exchangeHook = read('src/lib/auth/use-exchange-hash-for-session.ts');

    expect(authRoute).toContain('formatAuthCallbackError(errorCode, params?.error_description)');
    expect(authRoute).not.toContain('params?.error_description ?? authErrorMessage(errorCode)');

    expect(exchangeHook).toContain('formatAuthCallbackError(parsed.code, parsed.description)');
    expect(exchangeHook).toContain("formatAuthCallbackError('token_exchange_failed', err)");
    expect(exchangeHook).not.toContain('description: parsed.description');
    expect(exchangeHook).not.toContain('description: err instanceof Error ? err.message');
  });

  it('keeps shared auth-provider safety checks available from lib auth', () => {
    const utility = read('src/lib/auth/auth-error-message-utils.ts');
    const hookUtility = 'src/hooks/auth/auth-error-message-utils.ts';
    const authFormatterPaths = [
      'src/hooks/auth/login-error-messages.ts',
      'src/hooks/auth/password-change-error-messages.ts',
      'src/hooks/auth/password-reset-error-messages.ts',
      'src/hooks/auth/resend-confirmation-error-messages.ts',
      'src/hooks/auth/sign-up-error-messages.ts',
      'src/hooks/auth/accept-invitation-error-messages.ts',
    ];

    expect(utility).toContain('extractAuthErrorMessage');
    expect(utility).toContain('isUnsafeAuthProviderMessage');
    expect(() => read(hookUtility)).toThrow();

    for (const path of authFormatterPaths) {
      const source = read(path);
      expect(source).toContain("from '@/lib/auth/auth-error-message-utils'");
      expect(source).not.toContain('function extractMessage');
    }
  });
});
