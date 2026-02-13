export type AuthErrorCode =
  | 'invalid_request'
  | 'invalid_state'
  | 'access_denied'
  | 'token_exchange_failed'
  | 'account_creation_failed'
  | 'rate_limited'
  | 'auth_required'
  | 'unknown_error';

const DEFAULT_CODE: AuthErrorCode = 'unknown_error';

export function toAuthErrorCode(raw: unknown): AuthErrorCode {
  if (typeof raw !== 'string' || raw.length === 0) {
    return DEFAULT_CODE;
  }

  const value = raw.toLowerCase();
  if (value.includes('rate') && value.includes('limit')) return 'rate_limited';
  if (value.includes('token exchange')) return 'token_exchange_failed';
  if (value.includes('account creation')) return 'account_creation_failed';
  if (value.includes('invalid_state') || value.includes('invalid state')) return 'invalid_state';
  if (value.includes('invalid_request') || value.includes('invalid request')) return 'invalid_request';
  if (value.includes('access_denied') || value.includes('access denied')) return 'access_denied';
  if (value.includes('auth') && value.includes('required')) return 'auth_required';

  switch (value) {
    case 'invalid_request':
    case 'invalid_state':
    case 'access_denied':
    case 'token_exchange_failed':
    case 'account_creation_failed':
    case 'rate_limited':
    case 'auth_required':
      return value;
    default:
      return DEFAULT_CODE;
  }
}

export function authErrorMessage(code: AuthErrorCode): string {
  switch (code) {
    case 'invalid_request':
      return 'The authentication request was invalid. Please try again.';
    case 'invalid_state':
      return 'Your login session could not be verified. Please restart the flow.';
    case 'access_denied':
      return 'Access was denied by the provider.';
    case 'token_exchange_failed':
      return 'Authentication succeeded, but token exchange failed. Please retry.';
    case 'account_creation_failed':
      return 'We could not finish setting up your account. Please try again.';
    case 'rate_limited':
      return 'Too many attempts. Please wait and try again.';
    case 'auth_required':
      return 'Please sign in to continue.';
    default:
      return 'Something went wrong during authentication.';
  }
}
