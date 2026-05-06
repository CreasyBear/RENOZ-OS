import {
  extractAuthErrorMessage,
  isUnsafeAuthProviderMessage,
} from '@/lib/auth/auth-error-message-utils';

export type OAuthConnectionErrorCode =
  | 'invalid_request'
  | 'invalid_state'
  | 'access_denied'
  | 'rate_limited'
  | 'tenant_selection_required'
  | 'tenant_selection_failed'
  | 'connection_failed'
  | 'unknown_error';

export type OAuthConnectionErrorContext =
  | 'callback'
  | 'initiate'
  | 'disconnect'
  | 'sync'
  | 'loadTenantSelection'
  | 'completeTenantSelection';

const OAUTH_FALLBACKS: Record<OAuthConnectionErrorContext, string> = {
  callback: 'Connection was not completed. Please try again.',
  initiate: 'Connection setup is temporarily unavailable. Please try again.',
  disconnect: 'Connection disconnect is temporarily unavailable. Please refresh and try again.',
  sync: 'Integration sync is temporarily unavailable. Please try again.',
  loadTenantSelection:
    'Xero tenant choices are temporarily unavailable. Please reconnect Xero and try again.',
  completeTenantSelection:
    'Xero tenant connection is temporarily unavailable. Please try again.',
};

const INVALID_SESSION_MESSAGE =
  'This connection session is invalid or expired. Please reconnect and try again.';
const ACCESS_DENIED_MESSAGE =
  'Connection was cancelled or denied. Please try again when ready.';
const RATE_LIMIT_MESSAGE =
  'Too many connection attempts. Please wait before trying again.';
const TENANT_SELECTION_MESSAGE =
  'Choose a Xero organization to finish connecting.';
const TENANT_UNAVAILABLE_MESSAGE =
  'The selected Xero organization is no longer available. Reconnect Xero and choose again.';
const MISCONFIGURED_MESSAGE =
  'Connection setup is misconfigured. Contact support before trying again.';
const SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Sign in again before managing integrations.';
const INVALID_INITIATE_REQUEST_MESSAGE =
  'Connection request is invalid. Choose a provider and service before trying again.';

export function toOAuthConnectionErrorCode(raw: unknown): OAuthConnectionErrorCode {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return 'unknown_error';
  }

  const value = raw.toLowerCase();
  if (value.includes('tenant_selection_required')) return 'tenant_selection_required';
  if (value.includes('tenant') && value.includes('selection')) return 'tenant_selection_failed';
  if (value.includes('rate') && value.includes('limit')) return 'rate_limited';
  if (value.includes('access_denied') || value.includes('access denied')) return 'access_denied';
  if (value.includes('invalid_state') || value.includes('invalid state')) return 'invalid_state';
  if (value.includes('state') && (value.includes('invalid') || value.includes('expired'))) {
    return 'invalid_state';
  }
  if (value.includes('invalid_request') || value.includes('invalid request')) return 'invalid_request';
  if (value.includes('connection') || value.includes('oauth')) return 'connection_failed';

  switch (value) {
    case 'invalid_request':
    case 'invalid_state':
    case 'access_denied':
    case 'rate_limited':
    case 'tenant_selection_required':
    case 'tenant_selection_failed':
    case 'connection_failed':
      return value;
    default:
      return 'unknown_error';
  }
}

export function isUnsafeOAuthConnectionMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    isUnsafeAuthProviderMessage(message) ||
    normalized.includes('authorization code') ||
    normalized.includes('code verifier') ||
    normalized.includes('client_secret') ||
    normalized.includes('provider_token') ||
    normalized.includes('access_token') ||
    normalized.includes('refresh_token') ||
    normalized.includes('bearer ') ||
    normalized.includes('encrypted') ||
    normalized.includes('oauth state') ||
    normalized.includes('state id') ||
    normalized.includes('state record') ||
    normalized.includes('tenant id') ||
    normalized.includes('redirect uri') ||
    normalized.includes('redirect_url')
  );
}

export function formatOAuthConnectionError(
  error: unknown,
  context: OAuthConnectionErrorContext
): string {
  const message = extractAuthErrorMessage(error);
  const code = toOAuthConnectionErrorCode(message ?? error);

  if (code === 'invalid_request' && context === 'initiate') {
    return INVALID_INITIATE_REQUEST_MESSAGE;
  }

  if (code === 'invalid_state' || code === 'invalid_request') {
    return INVALID_SESSION_MESSAGE;
  }

  if (code === 'access_denied') {
    return ACCESS_DENIED_MESSAGE;
  }

  if (code === 'rate_limited') {
    return RATE_LIMIT_MESSAGE;
  }

  if (code === 'tenant_selection_required') {
    return TENANT_SELECTION_MESSAGE;
  }

  if (code === 'tenant_selection_failed') {
    return context === 'loadTenantSelection'
      ? OAUTH_FALLBACKS.loadTenantSelection
      : TENANT_UNAVAILABLE_MESSAGE;
  }

  if (!message || isUnsafeOAuthConnectionMessage(message)) {
    return OAUTH_FALLBACKS[context];
  }

  const normalized = message.toLowerCase();
  if (normalized.includes('session') && normalized.includes('expired')) {
    return SESSION_EXPIRED_MESSAGE;
  }

  if (normalized.includes('redirect') && normalized.includes('not allowed')) {
    return MISCONFIGURED_MESSAGE;
  }

  if (normalized.includes('no selectable xero tenants')) {
    return 'No selectable Xero organizations were found for this login.';
  }

  if (normalized.includes('xero') && normalized.includes('tenant')) {
    return context === 'loadTenantSelection'
      ? OAUTH_FALLBACKS.loadTenantSelection
      : TENANT_UNAVAILABLE_MESSAGE;
  }

  return OAUTH_FALLBACKS[context];
}

export function formatOAuthStatusMessage(message: unknown, status?: string): string {
  const extracted = extractAuthErrorMessage(message);

  if (status === 'success') {
    return extracted && !isUnsafeOAuthConnectionMessage(extracted)
      ? extracted
      : 'Integration activity completed.';
  }

  if (!extracted || isUnsafeOAuthConnectionMessage(extracted)) {
    return formatOAuthConnectionError(extracted, 'sync');
  }

  if (status === 'error') {
    return formatOAuthConnectionError(extracted, 'sync');
  }

  return extracted;
}

export function formatOAuthStatusDetailValue(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  const extracted = extractAuthErrorMessage(value);
  if (!extracted) {
    return 'Unavailable';
  }

  if (isUnsafeOAuthConnectionMessage(extracted)) {
    return 'Hidden for safety';
  }

  return extracted.length > 80 ? `${extracted.slice(0, 77)}...` : extracted;
}
