'use client';

import { WarrantyExtensionHistory } from '@/components/domain/warranty/views/warranty-extension-history';
import { WarrantyLineageSections } from '@/components/domain/warranty/views/warranty-lineage-sections';
import { WarrantyQuickAnswerStrip } from '@/components/domain/warranty/views/warranty-quick-answer-strip';
import { WarrantyServiceMissionControl } from '@/components/domain/warranty/views/warranty-service-linkage';
import type { WarrantyDetail, WarrantyDetailViewProps } from '@/lib/schemas/warranty';

interface WarrantyDetailOverviewTabProps {
  warranty: WarrantyDetail;
  daysUntilExpiry: number;
  extensions: WarrantyDetailViewProps['extensions'];
  isExtensionsLoading: boolean;
  isExtensionsError: boolean;
  onRetryExtensions: WarrantyDetailViewProps['onRetryExtensions'];
  onExtendDialogOpenChange: WarrantyDetailViewProps['onExtendDialogOpenChange'];
}

export function WarrantyDetailOverviewTab({
  warranty,
  daysUntilExpiry,
  extensions,
  isExtensionsLoading,
  isExtensionsError,
  onRetryExtensions,
  onExtendDialogOpenChange,
}: WarrantyDetailOverviewTabProps) {
  return (
    <div className="space-y-6">
      <WarrantyQuickAnswerStrip
        warranty={warranty}
        daysUntilExpiry={daysUntilExpiry}
      />

      <WarrantyServiceMissionControl warranty={warranty} />

      <WarrantyLineageSections
        warranty={warranty}
        daysUntilExpiry={daysUntilExpiry}
      />

      <WarrantyExtensionHistory
        warrantyId={warranty.id}
        originalExpiryDate={warranty.expiryDate}
        onExtendClick={() => onExtendDialogOpenChange(true)}
        showExtendButton={false}
        extensions={extensions}
        isLoading={isExtensionsLoading}
        isError={isExtensionsError}
        onRetry={onRetryExtensions}
      />
    </div>
  );
}
