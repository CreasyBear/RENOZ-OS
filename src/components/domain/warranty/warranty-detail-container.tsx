'use client';

/**
 * Warranty Detail Container
 *
 * Handles data fetching and mutations for warranty detail view.
 *
 * @source warranty from useWarranty hook
 * @source claims from useWarrantyClaimsByWarranty hook
 * @source extensions from useWarrantyExtensions hook
 * @source certificateStatus from useWarrantyCertificate hook
 */

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, FileWarning, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  useWarranty,
  useWarrantyClaimsByWarranty,
  useCreateWarrantyClaim,
  useApproveClaim,
  useDenyClaim,
  useWarrantyCertificate,
  useGenerateWarrantyCertificate,
  useRegenerateWarrantyCertificate,
  useWarrantyExtensions,
  useExtendWarranty,
  useUpdateWarrantyOptOut,
  type WarrantyClaimTypeValue,
} from '@/hooks/warranty';
import { useConfirmation } from '@/hooks';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { ErrorState } from '@/components/shared/error-state';
import type { WarrantyExtensionTypeValue } from '@/lib/schemas/warranty/extensions';
import {
  WarrantyDetailView,
  type WarrantyDetailViewWarranty,
  type WarrantyClaimListItem,
} from './warranty-detail-view';

const statusStyles: Record<
  string,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
> = {
  active: { variant: 'default', label: 'Active' },
  expiring_soon: { variant: 'outline', label: 'Expiring Soon' },
  expired: { variant: 'destructive', label: 'Expired' },
  voided: { variant: 'destructive', label: 'Voided' },
  transferred: { variant: 'secondary', label: 'Transferred' },
};

const policyTypeLabels: Record<string, string> = {
  battery_performance: 'Battery Performance',
  inverter_manufacturer: 'Inverter Manufacturer',
  installation_workmanship: 'Installation Workmanship',
};

export interface WarrantyDetailContainerRenderProps {
  headerTitle: React.ReactNode;
  headerActions?: React.ReactNode;
  content: React.ReactNode;
}

export interface WarrantyDetailContainerProps {
  warrantyId: string;
  children?: (props: WarrantyDetailContainerRenderProps) => React.ReactNode;
}

export function WarrantyDetailContainer({ warrantyId, children }: WarrantyDetailContainerProps) {
  const navigate = useNavigate();
  const confirm = useConfirmation();

  const {
    data: warranty,
    isLoading: isWarrantyLoading,
    error: warrantyError,
    refetch: refetchWarranty,
  } = useWarranty({ id: warrantyId });

  const {
    data: claimsData,
    isLoading: claimsLoading,
    refetch: refetchClaims,
  } = useWarrantyClaimsByWarranty(warrantyId);
  const claims = useMemo<WarrantyClaimListItem[]>(
    () => (claimsData?.items ?? []) as WarrantyClaimListItem[],
    [claimsData]
  );

  const createClaimMutation = useCreateWarrantyClaim();
  const approveClaimMutation = useApproveClaim();
  const denyClaimMutation = useDenyClaim();

  const {
    data: extensionsData,
    isLoading: extensionsLoading,
    isError: extensionsError,
    refetch: refetchExtensions,
  } = useWarrantyExtensions(warrantyId);

  const extendMutation = useExtendWarranty();

  const { data: certificateStatus, isLoading: certificateLoading } = useWarrantyCertificate(warrantyId);
  const generateCertificateMutation = useGenerateWarrantyCertificate();
  const regenerateCertificateMutation = useRegenerateWarrantyCertificate();

  const updateOptOutMutation = useUpdateWarrantyOptOut();

  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [selectedClaimForApproval, setSelectedClaimForApproval] =
    useState<WarrantyClaimListItem | null>(null);

  const [pendingOptOut, setPendingOptOut] = useState<boolean | null>(null);

  const handleOptOutToggle = (checked: boolean) => {
    if (!warranty) return;
    setPendingOptOut(checked);
    updateOptOutMutation.mutate(
      { warrantyId: warranty.id, optOut: checked },
      {
        onSuccess: (result) => {
          setPendingOptOut(null);
          toast.success(
            result.optOut
              ? 'Expiry alerts disabled for this warranty'
              : 'Expiry alerts enabled for this warranty'
          );
        },
        onError: () => {
          setPendingOptOut(null);
          toast.error('Failed to update notification settings');
        },
      }
    );
  };

  const handleGenerateCertificate = async () => {
    if (!warranty) return;
    const result = await generateCertificateMutation.mutateAsync({
      warrantyId: warranty.id,
      forceRegenerate: false,
    });

    if (result.success && result.certificateUrl) {
      window.open(result.certificateUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRegenerateCertificate = async () => {
    if (!warranty) return;
    const confirmed = await confirm.confirm({
      title: 'Regenerate Warranty Certificate',
      description:
        'Are you sure you want to regenerate this warranty certificate? The previous certificate will be replaced.',
      confirmLabel: 'Regenerate',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      const result = await regenerateCertificateMutation.mutateAsync({
        warrantyId: warranty.id,
        reason: 'User requested regeneration',
      });

      if (result.success && result.certificateUrl) {
        window.open(result.certificateUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleDownloadCertificate = () => {
    if (certificateStatus?.certificateUrl) {
      window.open(certificateStatus.certificateUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSubmitClaim = async (payload: {
    warrantyId: string;
    claimType: WarrantyClaimTypeValue;
    description: string;
    cycleCountAtClaim?: number;
    notes?: string;
  }) => {
    await createClaimMutation.mutateAsync(payload);
    await refetchClaims();
  };

  const handleApproveClaim = async (payload: { claimId: string; notes?: string }) => {
    await approveClaimMutation.mutateAsync(payload);
    await refetchClaims();
  };

  const handleDenyClaim = async (payload: { claimId: string; denialReason: string; notes?: string }) => {
    await denyClaimMutation.mutateAsync(payload);
    await refetchClaims();
  };

  const handleExtendWarranty = async (payload: {
    warrantyId: string;
    extensionType: WarrantyExtensionTypeValue;
    extensionMonths: number;
    price: number | null;
    notes: string | null;
  }) => {
    await extendMutation.mutateAsync(payload);
    await refetchExtensions();
  };

  const handleBackToList = useCallback(() => {
    navigate({
      to: '/reports/expiring-warranties',
      search: { range: '30', status: 'active', sort: 'expiry_asc', page: 1 },
    });
  }, [navigate]);

  const handleClaimRowClick = useCallback(
    (claimId: string) => {
      navigate({
        to: '/support/claims/$claimId',
        params: { claimId },
        search: {},
      });
    },
    [navigate]
  );

  const handleReviewClaim = (claim: WarrantyClaimListItem) => {
    setSelectedClaimForApproval(claim);
    setApprovalDialogOpen(true);
  };

  if (warrantyError) {
    return (
      <ErrorState
        title="Failed to load warranty"
        message={warrantyError instanceof Error ? warrantyError.message : 'Unknown error'}
        onRetry={() => refetchWarranty()}
      />
    );
  }

  if (isWarrantyLoading && !warranty) {
    return <SupportDetailSkeleton />;
  }

  if (!warranty) {
    return (
      <ErrorState
        title="Warranty not found"
        message="The warranty record could not be located."
        onRetry={() => refetchWarranty()}
      />
    );
  }

  const statusStyle = statusStyles[warranty.status] ?? statusStyles.active;
  const headerTitle = (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" onClick={handleBackToList}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div>
        <div className="flex items-center gap-2">
          <Shield className="text-muted-foreground h-5 w-5" />
          <span>{warranty.warrantyNumber}</span>
          <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {policyTypeLabels[warranty.policyType]} Warranty
        </p>
      </div>
    </div>
  );

  const canFileClaim = warranty.status === 'active' || warranty.status === 'expiring_soon';
  const headerActions = canFileClaim ? (
    <Button onClick={() => setClaimDialogOpen(true)}>
      <FileWarning className="mr-2 h-4 w-4" />
      File a Claim
    </Button>
  ) : undefined;

  const content = (
    <WarrantyDetailView
      warranty={{
        ...warranty,
        expiryAlertOptOut: pendingOptOut ?? warranty.expiryAlertOptOut,
      } as WarrantyDetailViewWarranty}
      claims={claims}
      extensions={extensionsData?.extensions ?? []}
      certificateStatus={certificateStatus ?? undefined}
      isClaimsLoading={claimsLoading}
      isExtensionsLoading={extensionsLoading}
      isExtensionsError={extensionsError}
      isCertificateLoading={certificateLoading}
      isGeneratingCertificate={generateCertificateMutation.isPending}
      isRegeneratingCertificate={regenerateCertificateMutation.isPending}
      isOptOutUpdating={updateOptOutMutation.isPending}
      isSubmittingClaim={createClaimMutation.isPending}
      isSubmittingApproval={approveClaimMutation.isPending || denyClaimMutation.isPending}
      isSubmittingExtend={extendMutation.isPending}
      isClaimDialogOpen={claimDialogOpen}
      isApprovalDialogOpen={approvalDialogOpen}
      isExtendDialogOpen={extendDialogOpen}
      selectedClaimForApproval={selectedClaimForApproval}
      onClaimRowClick={handleClaimRowClick}
      onReviewClaim={handleReviewClaim}
      onClaimDialogOpenChange={(open) => setClaimDialogOpen(open)}
      onApprovalDialogOpenChange={(open) => {
        setApprovalDialogOpen(open);
        if (!open) setSelectedClaimForApproval(null);
      }}
      onExtendDialogOpenChange={(open) => setExtendDialogOpen(open)}
      onRetryExtensions={() => refetchExtensions()}
      onClaimsSuccess={() => refetchClaims()}
      onExtensionsSuccess={() => refetchExtensions()}
      onSubmitClaim={handleSubmitClaim}
      onApproveClaim={handleApproveClaim}
      onDenyClaim={handleDenyClaim}
      onExtendWarranty={handleExtendWarranty}
      onToggleOptOut={handleOptOutToggle}
      onGenerateCertificate={handleGenerateCertificate}
      onRegenerateCertificate={handleRegenerateCertificate}
      onDownloadCertificate={handleDownloadCertificate}
    />
  );

  if (children) {
    return <>{children({ headerTitle, headerActions, content })}</>;
  }

  return content;
}
