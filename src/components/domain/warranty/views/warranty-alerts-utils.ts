import { generateAlertIdWithValue } from '@/hooks/_shared/use-alert-dismissals';
import type { WarrantyDetail } from '@/lib/schemas/warranty';

export type WarrantyAlertTone = 'critical' | 'warning' | 'info';
export type WarrantyAlertAction = 'extend' | 'review-claims' | 'enable-alerts';

export interface WarrantyAlertItem {
  id: string;
  tone: WarrantyAlertTone;
  title: string;
  description: string;
  actionLabel?: string;
  action?: WarrantyAlertAction;
}

interface BuildWarrantyAlertsInput {
  warrantyId: string;
  warrantyStatus: WarrantyDetail['status'];
  daysUntilExpiry: number;
  expiryAlertOptOut: boolean;
}

export function buildWarrantyAlerts({
  warrantyId,
  warrantyStatus,
  daysUntilExpiry,
  expiryAlertOptOut,
}: BuildWarrantyAlertsInput): WarrantyAlertItem[] {
  const alerts: WarrantyAlertItem[] = [];

  if (daysUntilExpiry <= 0 || warrantyStatus === 'expired') {
    const daysSinceExpiry = Math.abs(daysUntilExpiry);
    const canExtendExpired = daysSinceExpiry <= 90;
    const daysLeftToExtend = canExtendExpired ? 90 - daysSinceExpiry : null;

    alerts.push({
      id: generateAlertIdWithValue('warranty', warrantyId, 'expired', daysSinceExpiry),
      tone: 'critical',
      title: 'Warranty expired',
      description:
        daysUntilExpiry === 0
          ? 'Warranty expires today.'
          : `Warranty expired ${daysSinceExpiry} day${daysSinceExpiry === 1 ? '' : 's'} ago.${
              canExtendExpired && daysLeftToExtend !== null
                ? ` Can still be extended within the 90-day grace period (${daysLeftToExtend} days remaining).`
                : daysSinceExpiry > 90
                ? ' Cannot be extended (90-day grace period has passed).'
                : ''
            }`,
      actionLabel: canExtendExpired ? 'Extend warranty' : 'Review claims',
      action: canExtendExpired ? 'extend' : 'review-claims',
    });
  }

  if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
    alerts.push({
      id: generateAlertIdWithValue('warranty', warrantyId, 'expiring_soon', daysUntilExpiry),
      tone: 'warning',
      title: 'Warranty expiring soon',
      description: `Warranty expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}.`,
      actionLabel: 'Extend warranty',
      action: 'extend',
    });
  }

  if (expiryAlertOptOut) {
    alerts.push({
      id: generateAlertIdWithValue('warranty', warrantyId, 'alerts_disabled', 1),
      tone: 'info',
      title: 'Expiry alerts disabled',
      description: 'You will not receive expiry reminders for this warranty.',
      actionLabel: 'Enable alerts',
      action: 'enable-alerts',
    });
  }

  return alerts;
}
