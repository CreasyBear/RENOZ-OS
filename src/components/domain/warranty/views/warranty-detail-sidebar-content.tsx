'use client';

import { WarrantyCertificateStatusCard } from '@/components/domain/warranty/views/warranty-certificate-status-card';
import { WarrantyNotificationSettingsCard } from '@/components/domain/warranty/views/warranty-notification-settings-card';
import { WarrantySidebarSummaryCards } from '@/components/domain/warranty/views/warranty-sidebar-summary-cards';
import { WarrantyServiceSystemCard } from '@/components/domain/warranty/views/warranty-service-linkage';
import type { WarrantyDetail, WarrantyDetailViewProps } from '@/lib/schemas/warranty';

interface WarrantyDetailSidebarContentProps {
  warranty: WarrantyDetail;
  certificateStatus: WarrantyDetailViewProps['certificateStatus'];
  isCertificateLoading: boolean;
  certificateError?: string | null;
  isOptOutUpdating: boolean;
  onToggleOptOut: WarrantyDetailViewProps['onToggleOptOut'];
  onRetryCertificate?: WarrantyDetailViewProps['onRetryCertificate'];
  onOpenTransferOwnership?: WarrantyDetailViewProps['onOpenTransferOwnership'];
  isTransferringOwnership: boolean;
}

export function WarrantyDetailSidebarContent({
  warranty,
  certificateStatus,
  isCertificateLoading,
  certificateError,
  isOptOutUpdating,
  onToggleOptOut,
  onRetryCertificate,
  onOpenTransferOwnership,
  isTransferringOwnership,
}: WarrantyDetailSidebarContentProps) {
  return (
    <div className="space-y-6">
      <WarrantySidebarSummaryCards warranty={warranty} />

      <WarrantyServiceSystemCard
        warranty={warranty}
        onOpenTransferOwnership={onOpenTransferOwnership}
        isTransferringOwnership={isTransferringOwnership}
      />

      <WarrantyNotificationSettingsCard
        warranty={warranty}
        isOptOutUpdating={isOptOutUpdating}
        onToggleOptOut={onToggleOptOut}
      />

      <WarrantyCertificateStatusCard
        certificateStatus={certificateStatus}
        isCertificateLoading={isCertificateLoading}
        certificateError={certificateError}
        onRetryCertificate={onRetryCertificate}
      />
    </div>
  );
}
