import { describe, expect, it } from 'vitest';
import { authErrorMessage, toAuthErrorCode } from '@/lib/auth/error-codes';

describe('auth error codes', () => {
  it('maps known and unknown values safely', () => {
    expect(toAuthErrorCode('invalid_state')).toBe('invalid_state');
    expect(toAuthErrorCode('Google token exchange failed: bad_verification_code')).toBe(
      'token_exchange_failed'
    );
    expect(toAuthErrorCode('some-provider-internal-stack-trace')).toBe('unknown_error');
  });

  it('returns generic user-facing text for unknown values', () => {
    expect(authErrorMessage('unknown_error')).toBe('Something went wrong during authentication.');
  });
});
