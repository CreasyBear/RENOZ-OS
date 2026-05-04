'use client';

import { useMemo } from 'react';
import { WarrantyAlerts } from '@/components/domain/warranty/views/warranty-alerts';
import { buildWarrantyAlerts } from '@/components/domain/warranty/views/warranty-alerts-utils';
import { useAlertDismissals } from '@/hooks/_shared/use-alert-dismissals';
import type { WarrantyDetail, WarrantyDetailViewProps } from '@/lib/schemas/warranty';

type WarrantyDetailAlertsContext = Pick<WarrantyDetail, 'id' | 'status' | 'expiryAlertOptOut'>;

interface WarrantyDetailAlertsSectionProps {
  warranty: WarrantyDetailAlertsContext;
  daysUntilExpiry: number;
  onExtendDialogOpenChange: WarrantyDetailViewProps['onExtendDialogOpenChange'];
  onReviewClaims: () => void;
  onToggleOptOut: WarrantyDetailViewProps['onToggleOptOut'];
}

export function WarrantyDetailAlertsSection({
  warranty,
  daysUntilExpiry,
  onExtendDialogOpenChange,
  onReviewClaims,
  onToggleOptOut,
}: WarrantyDetailAlertsSectionProps) {
  const { dismiss, isAlertDismissed } = useAlertDismissals();

  const alerts = useMemo(() => {
    return buildWarrantyAlerts({
      warrantyId: warranty.id,
      warrantyStatus: warranty.status,
      daysUntilExpiry,
      expiryAlertOptOut: warranty.expiryAlertOptOut,
    });
  }, [daysUntilExpiry, warranty.expiryAlertOptOut, warranty.id, warranty.status]);

  const visibleAlerts = alerts.filter((alert) => !isAlertDismissed(alert.id)).slice(0, 3);

  return (
    <WarrantyAlerts
      alerts={visibleAlerts}
      onDismiss={dismiss}
      onExtendWarranty={() => onExtendDialogOpenChange(true)}
      onReviewClaims={onReviewClaims}
      onEnableAlerts={() => onToggleOptOut(false)}
    />
  );
}
