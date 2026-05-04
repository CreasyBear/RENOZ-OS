'use client';

import { useState } from 'react';
import { PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { EntityHeader } from '@/components/shared';
import { useWarrantyHeaderActions } from '@/hooks/warranty';
import { getWarrantyStatusConfigForEntityHeader } from '@/lib/warranty';
import type { ReactNode } from 'react';
import type { WarrantyDetail, WarrantyDetailViewProps } from '@/lib/schemas/warranty';

type WarrantyDetailHeaderContext = Pick<
  WarrantyDetail,
  'warrantyNumber' | 'productName' | 'currentOwner' | 'ownerRecord' | 'customerName' | 'status'
>;

interface WarrantyDetailHeaderSectionProps {
  warranty: WarrantyDetailHeaderContext;
  sidebarContent: ReactNode;
  headerActionsInLayout?: boolean;
  certificateStatus: WarrantyDetailViewProps['certificateStatus'];
  isSubmittingClaim: boolean;
  isSubmittingExtend: boolean;
  isCertificateLoading: boolean;
  isCertificateRegenerating: boolean;
  isCertificateGenerating: boolean;
  onClaimDialogOpenChange: WarrantyDetailViewProps['onClaimDialogOpenChange'];
  onExtendDialogOpenChange: WarrantyDetailViewProps['onExtendDialogOpenChange'];
  onDownloadCertificate?: WarrantyDetailViewProps['onDownloadCertificate'];
  onRegenerateCertificate?: WarrantyDetailViewProps['onRegenerateCertificate'];
  onGenerateCertificate?: WarrantyDetailViewProps['onGenerateCertificate'];
  onDelete?: WarrantyDetailViewProps['onDelete'];
}

export function WarrantyDetailHeaderSection({
  warranty,
  sidebarContent,
  headerActionsInLayout = false,
  certificateStatus,
  isSubmittingClaim,
  isSubmittingExtend,
  isCertificateLoading,
  isCertificateRegenerating,
  isCertificateGenerating,
  onClaimDialogOpenChange,
  onExtendDialogOpenChange,
  onDownloadCertificate,
  onRegenerateCertificate,
  onGenerateCertificate,
  onDelete,
}: WarrantyDetailHeaderSectionProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { primaryAction, secondaryActions } = useWarrantyHeaderActions({
    warrantyStatus: warranty.status,
    isSubmittingClaim,
    isSubmittingExtend,
    isCertificateLoading,
    certificateExists: certificateStatus?.exists,
    isCertificateRegenerating,
    isCertificateGenerating,
    onClaimDialogOpen: () => onClaimDialogOpenChange(true),
    onExtendDialogOpen: () => onExtendDialogOpenChange(true),
    onDownloadCertificate,
    onRegenerateCertificate,
    onGenerateCertificate,
  });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2 lg:hidden">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
              aria-label="Toggle warranty sidebar"
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px]">
            <SheetHeader>
              <SheetTitle>Warranty details</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-6">{sidebarContent}</div>
          </SheetContent>
        </Sheet>
      </div>

      <EntityHeader
        name={`Warranty ${warranty.warrantyNumber}`}
        subtitle={
          <>
            {warranty.productName ?? 'Unknown Product'} ·{' '}
            {warranty.currentOwner?.fullName ??
              warranty.ownerRecord?.fullName ??
              warranty.customerName ??
              'Unknown Owner'}
          </>
        }
        avatarFallback="W"
        status={getWarrantyStatusConfigForEntityHeader(warranty.status)}
        primaryAction={headerActionsInLayout ? undefined : primaryAction}
        secondaryActions={headerActionsInLayout ? [] : secondaryActions}
        onDelete={headerActionsInLayout ? undefined : onDelete}
      />
    </section>
  );
}
