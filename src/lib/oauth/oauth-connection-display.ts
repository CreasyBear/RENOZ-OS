import type { OAuthProvider, OAuthServiceType } from '@/lib/oauth/constants';

export interface OAuthConnectionDisplayDescriptor {
  provider: OAuthProvider;
  serviceType: OAuthServiceType;
  isActive: boolean;
}

export function formatOAuthConnectionAccountLabel(
  connection: OAuthConnectionDisplayDescriptor
): string | null {
  if (connection.provider !== 'xero' || connection.serviceType !== 'accounting') {
    return null;
  }

  return connection.isActive
    ? 'Accounting organization connected'
    : 'Accounting organization disconnected';
}

export function formatOAuthConnectionAccountDetail(
  connection: OAuthConnectionDisplayDescriptor
): string | null {
  if (connection.provider !== 'xero' || connection.serviceType !== 'accounting') {
    return null;
  }

  return connection.isActive
    ? 'Invoices, payments, and journals use this Xero accounting connection.'
    : 'Reconnect Xero before invoices, payments, or journals can sync.';
}
