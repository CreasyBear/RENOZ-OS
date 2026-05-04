import { describe, expect, it } from 'vitest';
import { buildWarrantyAlerts } from '@/components/domain/warranty/views/warranty-alerts-utils';

describe('buildWarrantyAlerts', () => {
  it('offers extension during expired warranty grace period', () => {
    expect(
      buildWarrantyAlerts({
        warrantyId: 'warranty-1',
        warrantyStatus: 'expired',
        daysUntilExpiry: -5,
        expiryAlertOptOut: false,
      })
    ).toEqual([
      {
        id: 'warranty:warranty-1:expired:5',
        tone: 'critical',
        title: 'Warranty expired',
        description:
          'Warranty expired 5 days ago. Can still be extended within the 90-day grace period (85 days remaining).',
        actionLabel: 'Extend warranty',
        action: 'extend',
      },
    ]);
  });

  it('sends expired warranties beyond the grace period to claim review', () => {
    expect(
      buildWarrantyAlerts({
        warrantyId: 'warranty-1',
        warrantyStatus: 'expired',
        daysUntilExpiry: -120,
        expiryAlertOptOut: false,
      })
    ).toEqual([
      {
        id: 'warranty:warranty-1:expired:120',
        tone: 'critical',
        title: 'Warranty expired',
        description:
          'Warranty expired 120 days ago. Cannot be extended (90-day grace period has passed).',
        actionLabel: 'Review claims',
        action: 'review-claims',
      },
    ]);
  });

  it('warns expiring soon warranties with an extension action', () => {
    expect(
      buildWarrantyAlerts({
        warrantyId: 'warranty-1',
        warrantyStatus: 'expiring_soon',
        daysUntilExpiry: 14,
        expiryAlertOptOut: false,
      })
    ).toEqual([
      {
        id: 'warranty:warranty-1:expiring_soon:14',
        tone: 'warning',
        title: 'Warranty expiring soon',
        description: 'Warranty expires in 14 days.',
        actionLabel: 'Extend warranty',
        action: 'extend',
      },
    ]);
  });

  it('keeps alert opt-out visible even when coverage is otherwise healthy', () => {
    expect(
      buildWarrantyAlerts({
        warrantyId: 'warranty-1',
        warrantyStatus: 'active',
        daysUntilExpiry: 180,
        expiryAlertOptOut: true,
      })
    ).toEqual([
      {
        id: 'warranty:warranty-1:alerts_disabled:1',
        tone: 'info',
        title: 'Expiry alerts disabled',
        description: 'You will not receive expiry reminders for this warranty.',
        actionLabel: 'Enable alerts',
        action: 'enable-alerts',
      },
    ]);
  });
});
