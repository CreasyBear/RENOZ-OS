import type { XeroIntegrationStatus } from '@/lib/schemas/settings/xero-sync';

export interface XeroIntegrationReadiness {
  available: boolean;
  message?: string;
  connectionId?: string;
}

export interface XeroIntegrationConnectionRow {
  isActive: boolean | null;
  hasTenant: boolean | null;
}

function isConfigurationUnavailable(message?: string): boolean {
  return /not configured|setup|configuration/i.test(message ?? '');
}

export function buildXeroIntegrationStatus(
  readiness: XeroIntegrationReadiness,
  connection?: XeroIntegrationConnectionRow | null
): XeroIntegrationStatus {
  if (connection && !connection.hasTenant) {
    return {
      available: false,
      provider: 'xero',
      isActive: Boolean(connection.isActive),
      status: 'configuration_unavailable',
      message: 'Xero accounting organization selection is incomplete. Reconnect Xero before syncing.',
      nextAction: 'reconnect_xero',
      nextActionLabel: 'Reconnect Xero',
    };
  }

  if (readiness.available) {
    return {
      available: true,
      provider: 'xero',
      isActive: true,
      status: 'connected',
      message: 'Xero accounting connection is active.',
      nextAction: null,
      nextActionLabel: null,
    };
  }

  if (connection) {
    return {
      available: false,
      provider: 'xero',
      isActive: Boolean(connection.isActive),
      status: 'reconnect_required',
      message: 'Xero accounting connection needs to be reconnected before invoices and journals can sync.',
      nextAction: 'reconnect_xero',
      nextActionLabel: 'Reconnect Xero',
    };
  }

  const configurationUnavailable = isConfigurationUnavailable(readiness.message);

  return {
    available: false,
    provider: 'xero',
    isActive: false,
    status: configurationUnavailable ? 'configuration_unavailable' : 'not_connected',
    message: configurationUnavailable
      ? 'Xero setup is incomplete. Review integration settings before syncing.'
      : 'Connect Xero before syncing invoices and journals.',
    nextAction: configurationUnavailable ? 'open_org_settings' : 'connect_xero',
    nextActionLabel: configurationUnavailable ? 'Review Settings' : 'Connect Xero',
  };
}
