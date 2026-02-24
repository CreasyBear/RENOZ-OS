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
import { toast } from 'sonner';
import {
  useWarranty,
  useWarrantyClaimsByWarranty,
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
import type { WarrantyExtensionTypeValue } from '@/lib/schemas/warranty/extensions';
import type {
  WarrantyClaimListItem,
  WarrantyDetailContainerRenderProps,
  WarrantyDetailContainerProps,
} from '@/lib/schemas/warranty';
import { openCertificateWindow } from '@/lib/warranty';
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
    refetch: refetchClaims,
  } = useWarrantyClaimsByWarranty(warrantyId);
  
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

  const { data: certificateStatus, isLoading: certificateLoading } = useWarrantyCertificate(warrantyId);
  const generateCertificateMutation = useGenerateWarrantyCertificate();
  const regenerateCertificateMutation = useRegenerateWarrantyCertificate();

  const updateOptOutMutation = useUpdateWarrantyOptOut();
  const deleteWarrantyMutation = useDeleteWarranty();

  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
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
    setCertificateError(null);
    setLastCertificateAction('generate');
    try {
      const result = await generateCertificateMutation.mutateAsync({
        warrantyId: warranty.id,
        forceRegenerate: false,
      });

      if (result.success && result.certificateUrl) {
        openCertificateWindow(result.certificateUrl, {
          errorMessage: 'Failed to open certificate',
        });
      } else {
        throw new Error('Certificate generation failed');
      }
    } catch (error) {
      setCertificateError(
        error instanceof Error ? error.message : 'Failed to generate certificate'
      );
      toast.error('Failed to generate certificate');
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

    if (confirmed.confirmed) {
      setCertificateError(null);
      setLastCertificateAction('regenerate');
      try {
        const result = await regenerateCertificateMutation.mutateAsync({
          warrantyId: warranty.id,
          reason: 'User requested regeneration',
        });

        if (result.success && result.certificateUrl) {
          openCertificateWindow(result.certificateUrl, {
            errorMessage: 'Failed to open certificate',
          });
        } else {
          throw new Error('Certificate regeneration failed');
        }
      } catch (error) {
        setCertificateError(
          error instanceof Error ? error.message : 'Failed to regenerate certificate'
        );
        toast.error('Failed to regenerate certificate');
      }
    }
  };

  const handleRetryCertificate = async () => {
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

  const handleRequestInfoClaim = async (payload: { claimId: string; notes: string }) => {
    await updateClaimStatusMutation.mutateAsync({
      claimId: payload.claimId,
      status: 'under_review',
      notes: payload.notes,
    });
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

    if (confirmed.confirmed) {
      try {
        await deleteWarrantyMutation.mutateAsync(warranty.id);
        toast.success('Warranty deleted successfully');
        navigate({ to: '/support/warranties' });
      } catch {
        toast.error('Failed to delete warranty');
      }
    }
  };

  if (warrantyError) {
    const errorContent = (
      <ErrorState
        title="Failed to load warranty"
        message={warrantyError instanceof Error ? warrantyError.message : 'Unknown error'}
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
        extensions={extensionsData?.extensions ?? []}
        certificateStatus={certificateStatus ?? undefined}
        isClaimsLoading={claimsLoading}
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
        onRetryExtensions={() => refetchExtensions()}
        onClaimsSuccess={() => refetchClaims()}
        onExtensionsSuccess={() => refetchExtensions()}
        onSubmitClaim={handleSubmitClaim}
        onApproveClaim={handleApproveClaim}
        onDenyClaim={handleDenyClaim}
        onRequestInfoClaim={handleRequestInfoClaim}
        onExtendWarranty={handleExtendWarranty}
        onToggleOptOut={handleOptOutToggle}
        certificateError={certificateError}
        onRetryCertificate={handleRetryCertificate}
        activities={activities ?? []}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        onLogActivity={onLogActivity}
        onScheduleFollowUp={onLogActivity}
        onDelete={handleDelete}
        onDownloadCertificate={handleDownloadCertificate}
        onGenerateCertificate={handleGenerateCertificate}
        onRegenerateCertificate={handleRegenerateCertificate}
        isCertificateGenerating={generateCertificateMutation.isPending}
        isCertificateRegenerating={regenerateCertificateMutation.isPending}
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
