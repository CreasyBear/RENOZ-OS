import type { OAuthProvider, OAuthServiceType } from '@/lib/oauth/constants';

export interface OAuthConnectionDisplayDescriptor {
  provider: OAuthProvider;
  serviceType: OAuthServiceType;
  isActive: boolean;
  accountLabel?: string | null;
}

export function formatOAuthConnectionAccountLabel(
  connection: OAuthConnectionDisplayDescriptor
): string | null {
  if (connection.provider !== 'xero' || connection.serviceType !== 'accounting') {
    return null;
  }

  const accountLabel = connection.accountLabel?.trim();
  if (accountLabel) {
    return accountLabel;
  }

  return connection.isActive ? 'Xero accounting organization' : 'Xero accounting disconnected';
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
