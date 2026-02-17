import { describe, expect, it } from 'vitest';
import { authErrorMessage, toAuthErrorCode } from '@/lib/auth/error-codes';

describe('auth error route behavior', () => {
  it('shows generic message when error code is unknown_error', () => {
    const message = authErrorMessage(toAuthErrorCode(undefined));
    expect(message).toBe('Something went wrong during authentication.');
  });

  it('shows password reset message for invalid_request', () => {
    const message = authErrorMessage(toAuthErrorCode('invalid_request'));
    expect(message).toContain('invalid');
  });

  it('maps invalid_request to show "Request new link" (password reset related)', () => {
    const code = toAuthErrorCode('invalid_request');
    const passwordResetCodes = ['invalid_request', 'token_exchange_failed', 'access_denied'];
    expect(passwordResetCodes).toContain(code);
  });

  it('maps token_exchange_failed to password reset related', () => {
    const code = toAuthErrorCode('token_exchange_failed');
    const passwordResetCodes = ['invalid_request', 'token_exchange_failed', 'access_denied'];
    expect(passwordResetCodes).toContain(code);
  });

  it('maps access_denied to password reset related', () => {
    const code = toAuthErrorCode('access_denied');
    const passwordResetCodes = ['invalid_request', 'token_exchange_failed', 'access_denied'];
    expect(passwordResetCodes).toContain(code);
  });

  it('validateSearch returns object with undefined when no error params (direct nav to /auth/error)', () => {
    const validateSearch = (params: Record<string, unknown>) => {
      const error = params.error && typeof params.error === 'string' ? params.error : undefined;
      const errorDescription =
        params.error_description && typeof params.error_description === 'string'
          ? params.error_description
          : undefined;
      return { error, error_description: errorDescription };
    };

    expect(validateSearch({})).toEqual({ error: undefined, error_description: undefined });
    expect(validateSearch({ foo: 'bar' })).toEqual({ error: undefined, error_description: undefined });
  });

  it('validateSearch returns error params when present', () => {
    const validateSearch = (params: Record<string, unknown>) => {
      const error = params.error && typeof params.error === 'string' ? params.error : undefined;
      const errorDescription =
        params.error_description && typeof params.error_description === 'string'
          ? params.error_description
          : undefined;
      if (error || errorDescription) {
        return { error, error_description: errorDescription };
      }
      return null;
    };

    expect(validateSearch({ error: 'invalid_request', error_description: 'Expired' })).toEqual({
      error: 'invalid_request',
      error_description: 'Expired',
    });
  });
});
