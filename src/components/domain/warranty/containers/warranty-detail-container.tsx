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
import {
  useWarranty,
  useWarrantyClaimsByWarranty,
  useWarrantyClaimSummary,
  useCreateWarrantyClaim,
  useApproveClaim,
  useDenyClaim,
  useUpdateClaimStatus,
  useWarrantyCertificate,
  useGenerateWarrantyCertificate,
  useRegenerateWarrantyCertificate,
  useWarrantyExtensions,
  useExtendWarranty,
  useUpdateWarrantyOptOut,
  useDeleteWarranty,
  useTransferWarranty,
  type WarrantyClaimTypeValue,
} from '@/hooks/warranty';
import { useConfirmation } from '@/hooks';
import { useTrackView } from '@/hooks/search';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { ErrorState } from '@/components/shared/error-state';
import { EntityHeaderActions } from '@/components/shared';
import { useWarrantyHeaderActions } from '@/hooks/warranty';
import { Skeleton } from '@/components/ui/skeleton';
import { EntityActivityLogger } from '@/components/shared/activity';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import { useUnifiedActivities } from '@/hooks/activities';
import { getSummaryState } from '@/lib/metrics/summary-health';
import {
  formatWarrantyCertificateResultError,
  WARRANTY_CERTIFICATE_GENERATION_FAILED_MESSAGE,
} from '@/lib/warranty/certificate-result-errors';
import type { WarrantyExtensionTypeValue } from '@/lib/schemas/warranty/extensions';
import type {
  WarrantyClaimListItem,
  WarrantyDetailContainerRenderProps,
  WarrantyDetailContainerProps,
} from '@/lib/schemas/warranty';
import { formatWarrantyReadError, openCertificateWindow } from '@/lib/warranty';
import { TransferWarrantyDialog } from '../dialogs/transfer-warranty-dialog';
import { WarrantyDetailView } from '../views/warranty-detail-view';

export type { WarrantyDetailContainerRenderProps, WarrantyDetailContainerProps };

export function WarrantyDetailContainer({ warrantyId, children }: WarrantyDetailContainerProps) {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();

  const {
    data: warranty,
    isLoading: isWarrantyLoading,
    error: warrantyError,
    refetch: refetchWarranty,
  } = useWarranty({ id: warrantyId });
  useTrackView('warranty', warranty?.id, warranty?.productName ?? `Warranty ${warrantyId.slice(0, 8)}`, warranty?.customerName ?? undefined, `/support/warranties/${warrantyId}`);

  const {
    data: claimsData,
    isLoading: claimsLoading,
    isError: isClaimsError,
    refetch: refetchClaims,
  } = useWarrantyClaimsByWarranty(warrantyId);
  const {
    data: claimSummary,
    isLoading: claimSummaryLoading,
    error: claimSummaryError,
  } = useWarrantyClaimSummary(warrantyId);
  const claimSummaryState = getSummaryState({
    data: claimSummary,
    error: claimSummaryError,
    isLoading: claimSummaryLoading,
  });
  
  // Server function returns ListWarrantyClaimsResult with productId at source (SCHEMA-TRACE.md)
  const claims = useMemo<WarrantyClaimListItem[]>(
    () => claimsData?.items ?? [],
    [claimsData]
  );

  const createClaimMutation = useCreateWarrantyClaim();
  const approveClaimMutation = useApproveClaim();
  const denyClaimMutation = useDenyClaim();
  const updateClaimStatusMutation = useUpdateClaimStatus();

  const {
    data: extensionsData,
    isLoading: extensionsLoading,
    isError: extensionsError,
    refetch: refetchExtensions,
  } = useWarrantyExtensions(warrantyId);

  const extendMutation = useExtendWarranty();
  const transferWarrantyMutation = useTransferWarranty();

  const {
    data: certificateStatus,
    isLoading: certificateLoading,
    isError: isCertificateStatusError,
    error: certificateStatusQueryError,
    refetch: refetchCertificateStatus,
  } = useWarrantyCertificate(warrantyId);
  const generateCertificateMutation = useGenerateWarrantyCertificate();
  const regenerateCertificateMutation = useRegenerateWarrantyCertificate();

  const updateOptOutMutation = useUpdateWarrantyOptOut();
  const deleteWarrantyMutation = useDeleteWarranty();

  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [pendingClaimAction, setPendingClaimAction] = useState<{
    claimId: string;
    action: 'review' | 'open' | 'resolve';
  } | null>(null);
  const [selectedClaimForApproval, setSelectedClaimForApproval] =
    useState<WarrantyClaimListItem | null>(null);

  const [pendingOptOut, setPendingOptOut] = useState<boolean | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);
  const [lastCertificateAction, setLastCertificateAction] = useState<
    'generate' | 'regenerate' | null
  >(null);
  const { onLogActivity, loggerProps } = useEntityActivityLogging({
    entityType: 'warranty',
    entityId: warrantyId,
    entityLabel: `Warranty: ${warranty?.productName ?? warrantyId}`,
  });

  // Fetch activities
  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'warranty',
    entityId: warrantyId,
  });

  const {
    activities: systemActivities,
    isLoading: systemActivitiesLoading,
    error: systemActivitiesError,
  } = useUnifiedActivities({
    entityType: 'service_system',
    entityId: warranty?.serviceSystem?.id ?? '',
    enabled: !!warranty?.serviceSystem?.id,
  });

  const handleOptOutToggle = (checked: boolean) => {
    if (!warranty) return;
    setPendingOptOut(checked);
    updateOptOutMutation.mutate(
      { warrantyId: warranty.id, optOut: checked },
      {
        onSuccess: () => {
          setPendingOptOut(null);
        },
        onError: () => {
          setPendingOptOut(null);
        },
      }
    );
  };

  const handleGenerateCertificate = async () => {
    if (!warranty) return;
    setCertificateError(null);
    setLastCertificateAction('generate');
    try {
      const result = await generateCertificateMutation.mutateAsync({
        warrantyId: warranty.id,
        forceRegenerate: false,
      });

      if (result.success && result.certificateUrl) {
        try {
          openCertificateWindow(result.certificateUrl, {
            errorMessage: 'Failed to open certificate',
          });
        } catch (error) {
          setCertificateError(
            error instanceof Error ? error.message : 'Failed to open certificate'
          );
        }
      } else {
        setCertificateError(formatWarrantyCertificateResultError(result.error));
      }
    } catch {
      setCertificateError(WARRANTY_CERTIFICATE_GENERATION_FAILED_MESSAGE);
    }
  };

  const handleRegenerateCertificate = async () => {
    if (!warranty) return;
    const confirmed = await confirm({
      title: 'Regenerate Warranty Certificate',
      description:
        'Are you sure you want to regenerate this warranty certificate? The previous certificate will be replaced.',
      confirmLabel: 'Regenerate',
      variant: 'destructive',
    });

    if (confirmed) {
      setCertificateError(null);
      setLastCertificateAction('regenerate');
      try {
        const result = await regenerateCertificateMutation.mutateAsync({
          warrantyId: warranty.id,
          reason: 'User requested regeneration',
        });

        if (result.success && result.certificateUrl) {
          try {
            openCertificateWindow(result.certificateUrl, {
              errorMessage: 'Failed to open certificate',
            });
          } catch (error) {
            setCertificateError(
              error instanceof Error ? error.message : 'Failed to open certificate'
            );
          }
        } else {
          setCertificateError(formatWarrantyCertificateResultError(result.error));
        }
      } catch {
        setCertificateError(WARRANTY_CERTIFICATE_GENERATION_FAILED_MESSAGE);
      }
    }
  };

  const handleRetryCertificate = async () => {
    if (isCertificateStatusError) {
      await refetchCertificateStatus();
      return;
    }
    if (lastCertificateAction === 'regenerate') {
      await handleRegenerateCertificate();
      return;
    }
    await handleGenerateCertificate();
  };

  const handleDownloadCertificate = () => {
    if (certificateStatus?.certificateUrl) {
      openCertificateWindow(certificateStatus.certificateUrl, {
        errorMessage: 'Failed to open certificate',
      });
    }
  };

  const certificateStatusErrorMessage = isCertificateStatusError
    ? formatWarrantyReadError(
        certificateStatusQueryError,
        'Warranty certificate status is temporarily unavailable. Please refresh and try again.'
      )
    : null;

  // Must be before early returns (hooks rule)
  const { primaryAction, secondaryActions } = useWarrantyHeaderActions({
    warrantyStatus: warranty?.status ?? 'draft',
    isSubmittingClaim: createClaimMutation.isPending,
    isSubmittingExtend: extendMutation.isPending,
    isCertificateLoading: certificateLoading,
    certificateExists: certificateStatus?.exists,
    isCertificateRegenerating: regenerateCertificateMutation.isPending,
    isCertificateGenerating: generateCertificateMutation.isPending,
    onClaimDialogOpen: () => setClaimDialogOpen(true),
    onExtendDialogOpen: () => setExtendDialogOpen(true),
    onDownloadCertificate: handleDownloadCertificate,
    onRegenerateCertificate: handleRegenerateCertificate,
    onGenerateCertificate: handleGenerateCertificate,
  });

  const handleSubmitClaim = async (payload: {
    warrantyId: string;
    claimType: WarrantyClaimTypeValue;
    description: string;
    claimantRole?: import('@/lib/schemas/warranty').WarrantyClaimantRoleValue;
    claimantCustomerId?: string;
    claimantSnapshot?: import('@/lib/schemas/warranty').WarrantyClaimantSnapshot;
    channelBypassReason?: string;
    cycleCountAtClaim?: number;
    notes?: string;
  }) => {
    await createClaimMutation.mutateAsync(payload);
  };

  const handleApproveClaim = async (payload: { claimId: string; notes?: string }) => {
    await approveClaimMutation.mutateAsync(payload);
  };

  const handleDenyClaim = async (payload: { claimId: string; denialReason: string; notes?: string }) => {
    await denyClaimMutation.mutateAsync(payload);
  };

  const handleRequestInfoClaim = async (payload: { claimId: string; notes: string }) => {
    await updateClaimStatusMutation.mutateAsync({
      claimId: payload.claimId,
      status: 'under_review',
      notes: payload.notes,
    });
  };

  const handleExtendWarranty = async (payload: {
    warrantyId: string;
    extensionType: WarrantyExtensionTypeValue;
    extensionMonths: number;
    price: number | null;
    notes: string | null;
  }) => {
    await extendMutation.mutateAsync(payload);
  };

  const handleTransferWarranty = async (payload: {
    id: string;
    newOwner: import('@/lib/schemas/service').ServiceOwnerInput;
    reason: string;
  }) => {
    await transferWarrantyMutation.mutateAsync(payload);
    await refetchWarranty();
  };

  const handleClaimRowClick = useCallback(
    (claimId: string) => {
      setPendingClaimAction({ claimId, action: 'open' });
      void navigate({
        to: '/support/claims/$claimId',
        params: { claimId },
        search: {},
      })
        .then(() => {
          setTimeout(() => {
            setPendingClaimAction((prev) =>
              prev?.claimId === claimId && prev.action === 'open' ? null : prev
            );
          }, 750);
        })
        .catch(() => {
          setPendingClaimAction((prev) =>
            prev?.claimId === claimId && prev.action === 'open' ? null : prev
          );
        });
    },
    [navigate]
  );

  const handleReviewClaim = (claim: WarrantyClaimListItem) => {
    setPendingClaimAction({
      claimId: claim.id,
      action: claim.status === 'approved' ? 'resolve' : 'review',
    });
    setSelectedClaimForApproval(claim);
    setApprovalDialogOpen(true);
  };

  const handleResolveClaimRow = useCallback(
    (claimId: string) => {
      setPendingClaimAction({ claimId, action: 'resolve' });
      void navigate({
        to: '/support/claims/$claimId',
        params: { claimId },
        search: {},
      })
        .then(() => {
          setTimeout(() => {
            setPendingClaimAction((prev) =>
              prev?.claimId === claimId && prev.action === 'resolve' ? null : prev
            );
          }, 750);
        })
        .catch(() => {
          setPendingClaimAction((prev) =>
            prev?.claimId === claimId && prev.action === 'resolve' ? null : prev
          );
        });
    },
    [navigate]
  );

  const handleDelete = async () => {
    if (!warranty) return;
    
    const confirmed = await confirm({
      title: 'Delete Warranty',
      description: `Are you sure you want to delete this warranty for "${warranty.productName}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    });

    if (confirmed) {
      try {
        await deleteWarrantyMutation.mutateAsync(warranty.id);
        navigate({ to: '/support/warranties' });
      } catch {
        // The warranty mutation hook owns the operator-facing error toast.
      }
    }
  };

  if (warrantyError) {
    const errorContent = (
      <ErrorState
        title="Failed to load warranty"
        message={formatWarrantyReadError(
          warrantyError,
          'Warranty details are temporarily unavailable. Please refresh and try again.'
        )}
        onRetry={() => refetchWarranty()}
      />
    );
    if (children) {
      return <>{children({ headerActions: null, content: errorContent })}</>;
    }
    return errorContent;
  }

  if (isWarrantyLoading && !warranty) {
    const loadingContent = <SupportDetailSkeleton />;
    if (children) {
      return <>{children({ headerActions: <Skeleton className="h-10 w-32" />, content: loadingContent })}</>;
    }
    return loadingContent;
  }

  if (!warranty) {
    const errorContent = (
      <ErrorState
        title="Warranty not found"
        message="The warranty record could not be located."
        onRetry={() => refetchWarranty()}
      />
    );
    if (children) {
      return <>{children({ headerActions: null, content: errorContent })}</>;
    }
    return errorContent;
  }

  const headerActions = children ? (
    <EntityHeaderActions
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      onDelete={handleDelete}
    />
  ) : undefined;

  const content = (
    <>
      <WarrantyDetailView
        warranty={{
          ...warranty,
          expiryAlertOptOut: pendingOptOut ?? warranty.expiryAlertOptOut,
        }}
        headerActionsInLayout={!!children}
        claims={claims}
        claimSummary={claimSummary}
        claimSummaryState={claimSummaryState}
        extensions={extensionsData?.extensions ?? []}
        certificateStatus={certificateStatus ?? undefined}
        isClaimsLoading={claimsLoading}
        isClaimsError={isClaimsError}
        isClaimSummaryLoading={claimSummaryLoading}
        isExtensionsLoading={extensionsLoading}
        isExtensionsError={extensionsError}
        isCertificateLoading={certificateLoading}
        isOptOutUpdating={updateOptOutMutation.isPending}
        isSubmittingClaim={createClaimMutation.isPending}
        isSubmittingApproval={
          approveClaimMutation.isPending ||
          denyClaimMutation.isPending ||
          updateClaimStatusMutation.isPending
        }
        isSubmittingExtend={extendMutation.isPending}
        isClaimDialogOpen={claimDialogOpen}
        isApprovalDialogOpen={approvalDialogOpen}
        isExtendDialogOpen={extendDialogOpen}
        selectedClaimForApproval={selectedClaimForApproval}
        pendingClaimAction={pendingClaimAction}
        onClaimRowClick={handleClaimRowClick}
        onResolveClaimRow={handleResolveClaimRow}
        onReviewClaim={handleReviewClaim}
        onClaimDialogOpenChange={(open) => setClaimDialogOpen(open)}
        onApprovalDialogOpenChange={(open) => {
          setApprovalDialogOpen(open);
          if (!open) {
            setSelectedClaimForApproval(null);
            setPendingClaimAction((prev) =>
              prev?.action === 'review' || prev?.action === 'resolve' ? null : prev
            );
          }
        }}
        onExtendDialogOpenChange={(open) => setExtendDialogOpen(open)}
        onOpenTransferOwnership={() => setTransferDialogOpen(true)}
        onRetryClaims={() => refetchClaims()}
        onRetryExtensions={() => refetchExtensions()}
        onClaimsSuccess={() => refetchClaims()}
        onExtensionsSuccess={() => refetchExtensions()}
        onSubmitClaim={handleSubmitClaim}
        onApproveClaim={handleApproveClaim}
        onDenyClaim={handleDenyClaim}
        onRequestInfoClaim={handleRequestInfoClaim}
        onExtendWarranty={handleExtendWarranty}
        onToggleOptOut={handleOptOutToggle}
        certificateError={certificateStatusErrorMessage ?? certificateError}
        onRetryCertificate={handleRetryCertificate}
        activities={activities ?? []}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        systemActivities={systemActivities ?? []}
        systemActivitiesLoading={systemActivitiesLoading}
        systemActivitiesError={systemActivitiesError}
        onLogActivity={onLogActivity}
        onScheduleFollowUp={onLogActivity}
        onDelete={handleDelete}
        onDownloadCertificate={handleDownloadCertificate}
        onGenerateCertificate={handleGenerateCertificate}
        onRegenerateCertificate={handleRegenerateCertificate}
        isCertificateGenerating={generateCertificateMutation.isPending}
        isCertificateRegenerating={regenerateCertificateMutation.isPending}
        isTransferringOwnership={transferWarrantyMutation.isPending}
      />

      <TransferWarrantyDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        warranty={{
          id: warranty.id,
          warrantyNumber: warranty.warrantyNumber,
          productName: warranty.productName ?? undefined,
          customerName: warranty.customerName ?? undefined,
        }}
        onSubmit={handleTransferWarranty}
        isSubmitting={transferWarrantyMutation.isPending}
      />

      {/* Activity Logger Dialog */}
      <EntityActivityLogger {...loggerProps} />

    </>
  );

  if (children) {
    return <>{children({ headerActions, content })}</>;
  }

  return content;
}
