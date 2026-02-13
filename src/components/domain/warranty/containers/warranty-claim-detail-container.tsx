'use client';

/**
 * Warranty Claim Detail Container
 *
 * Handles data fetching, mutations, and dialog state for claim detail view.
 *
 * @source claim from useWarrantyClaim hook
 */

import { useState } from 'react';

import {
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
  RefreshCw,
  Banknote,
  CalendarPlus,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { ErrorState } from '@/components/shared/error-state';
import { EntityHeaderActions } from '@/components/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmation } from '@/hooks';
import { useTrackView } from '@/hooks/search';
import {
  useWarrantyClaim,
  useUpdateClaimStatus,
  useApproveClaim,
  useDenyClaim,
  useResolveClaim,
  useCancelWarrantyClaim,
  type WarrantyClaimResolutionTypeValue,
} from '@/hooks/warranty';
import {
  isWarrantyClaimResolutionTypeValue,
  type WarrantyClaimDetailContainerRenderProps,
  type WarrantyClaimDetailContainerProps,
} from '@/lib/schemas/warranty';
import { getSlaDueStatus } from '@/lib/warranty/claims-utils';
import { WarrantyClaimDetailView } from '@/components/domain/warranty/views/warranty-claim-detail-view';

export type { WarrantyClaimDetailContainerRenderProps, WarrantyClaimDetailContainerProps };

const RESOLUTION_OPTIONS: {
  value: WarrantyClaimResolutionTypeValue;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: 'repair', label: 'Repair', icon: <Wrench className="h-4 w-4" /> },
  { value: 'replacement', label: 'Replace', icon: <RefreshCw className="h-4 w-4" /> },
  { value: 'refund', label: 'Refund', icon: <Banknote className="h-4 w-4" /> },
  { value: 'warranty_extension', label: 'Warranty Extension', icon: <CalendarPlus className="h-4 w-4" /> },
];

export function WarrantyClaimDetailContainer({
  claimId,
  children,
}: WarrantyClaimDetailContainerProps) {
  const { data: claim, isLoading, error, refetch } = useWarrantyClaim(claimId);
  const currentClaim = claim ?? null;
  useTrackView(
    'warranty_claim',
    currentClaim?.id,
    currentClaim?.claimNumber ?? `Claim ${claimId.slice(0, 8)}`,
    currentClaim?.status ?? undefined,
    `/support/claims/${claimId}`
  );

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  const { confirm } = useConfirmation();

  const [approvalNotes, setApprovalNotes] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [denialNotes, setDenialNotes] = useState('');
  const [resolutionType, setResolutionType] = useState<WarrantyClaimResolutionTypeValue>('repair');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionCost, setResolutionCost] = useState('');
  const [extensionMonths, setExtensionMonths] = useState('12');

  const updateStatusMutation = useUpdateClaimStatus();
  const approveMutation = useApproveClaim();
  const denyMutation = useDenyClaim();
  const resolveMutation = useResolveClaim();
  const cancelMutation = useCancelWarrantyClaim();

  const responseSla = currentClaim?.slaTracking?.responseDueAt
    ? getSlaDueStatus(
        currentClaim.slaTracking.responseDueAt,
        currentClaim.slaTracking?.respondedAt ?? null,
        currentClaim.submittedAt
      )
    : null;

  const resolutionSla = currentClaim?.slaTracking?.resolutionDueAt
    ? getSlaDueStatus(
        currentClaim.slaTracking.resolutionDueAt,
        currentClaim.slaTracking?.resolvedAt ?? null,
        currentClaim.submittedAt
      )
    : null;

  const canApprove =
    currentClaim?.status === 'submitted' || currentClaim?.status === 'under_review';
  const canDeny =
    currentClaim?.status === 'submitted' || currentClaim?.status === 'under_review';
  const canResolve = currentClaim?.status === 'approved';
  const canStartReview = currentClaim?.status === 'submitted';
  const canCancel =
    currentClaim?.status === 'submitted' || currentClaim?.status === 'under_review';

  const handleStartReview = async () => {
    if (!currentClaim) return;
    await updateStatusMutation.mutateAsync({
      claimId: currentClaim.id,
      status: 'under_review',
    });
  };

  const handleApprove = async () => {
    if (!currentClaim) return;
    await approveMutation.mutateAsync({
      claimId: currentClaim.id,
      notes: approvalNotes.trim() || undefined,
    });
    setApproveDialogOpen(false);
    setApprovalNotes('');
  };

  const handleDeny = async () => {
    if (!currentClaim || !denialReason.trim()) return;
    await denyMutation.mutateAsync({
      claimId: currentClaim.id,
      denialReason: denialReason.trim(),
      notes: denialNotes.trim() || undefined,
    });
    setDenyDialogOpen(false);
    setDenialReason('');
    setDenialNotes('');
  };

  const handleResolve = async () => {
    if (!currentClaim) return;
    await resolveMutation.mutateAsync({
      claimId: currentClaim.id,
      resolutionType,
      resolutionNotes: resolutionNotes.trim() || undefined,
      cost: resolutionCost ? parseFloat(resolutionCost) : undefined,
      extensionMonths: resolutionType === 'warranty_extension' ? parseInt(extensionMonths, 10) : undefined,
    });
    setResolveDialogOpen(false);
    setResolutionNotes('');
    setResolutionCost('');
  };

  const handleCancelClick = async () => {
    if (!currentClaim) return;
    await confirm({
      title: 'Cancel Claim',
      description: `Are you sure you want to cancel claim ${currentClaim.claimNumber}? This action cannot be undone.`,
      confirmLabel: 'Cancel Claim',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await cancelMutation.mutateAsync({ id: currentClaim.id });
          toast.success('Claim cancelled successfully');
          refetch();
        } catch (err) {
          toast.error('Failed to cancel claim');
          throw err;
        }
      },
    });
  };

  const primaryAction = currentClaim
    ? canApprove
      ? {
          label: 'Approve',
          onClick: () => setApproveDialogOpen(true),
          icon: <CheckCircle2 className="h-4 w-4" />,
          disabled: false,
        }
      : canResolve
        ? {
            label: 'Resolve',
            onClick: () => setResolveDialogOpen(true),
            icon: <CheckCircle2 className="h-4 w-4" />,
            disabled: false,
          }
        : undefined
    : undefined;

  const secondaryActions = currentClaim
    ? [
        {
          label: 'Start Review',
          onClick: handleStartReview,
          icon: <Clock className="h-4 w-4" />,
          disabled: !canStartReview || updateStatusMutation.isPending,
          disabledReason: !canStartReview
            ? 'Only submitted claims can be moved to review'
            : undefined,
        },
        ...(primaryAction?.label !== 'Approve'
          ? [
              {
                label: 'Approve',
                onClick: () => setApproveDialogOpen(true),
                icon: <CheckCircle2 className="h-4 w-4" />,
                disabled: !canApprove,
                disabledReason: !canApprove
                  ? 'Claim must be under review before approval'
                  : undefined,
              },
            ]
          : []),
        {
          label: 'Deny',
          onClick: () => setDenyDialogOpen(true),
          icon: <XCircle className="h-4 w-4" />,
          destructive: true,
          disabled: !canDeny,
          disabledReason: !canDeny
            ? 'Claim must be under review before denial'
            : undefined,
        },
        ...(primaryAction?.label !== 'Resolve'
          ? [
              {
                label: 'Resolve',
                onClick: () => setResolveDialogOpen(true),
                icon: <CheckCircle2 className="h-4 w-4" />,
                disabled: !canResolve,
                disabledReason: !canResolve
                  ? 'Only approved claims can be resolved'
                  : undefined,
              },
            ]
          : []),
        {
          label: 'Cancel Claim',
          onClick: handleCancelClick,
          icon: <Ban className="h-4 w-4" />,
          destructive: true,
          disabled: !canCancel,
          disabledReason: !canCancel
            ? 'Only submitted or under review claims can be cancelled'
            : undefined,
        },
      ]
    : [];

  if (error) {
    const content = (
      <ErrorState
        title="Failed to load claim"
        message={error instanceof Error ? error.message : 'Unknown error'}
        onRetry={() => refetch()}
      />
    );
    return children ? <>{children({ headerActions: null, content })}</> : content;
  }

  if (isLoading || !currentClaim) {
    const content = <SupportDetailSkeleton />;
    return children
      ? <>{children({ headerActions: <Skeleton className="h-10 w-32" />, content })}</>
      : content;
  }

  const headerActions = children ? (
    <EntityHeaderActions
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
    />
  ) : undefined;

  const content = (
    <>
      <WarrantyClaimDetailView
        claim={currentClaim}
        primaryAction={children ? undefined : primaryAction}
        secondaryActions={children ? [] : secondaryActions}
        responseSla={responseSla}
        resolutionSla={resolutionSla}
      />

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Claim</DialogTitle>
            <DialogDescription>
              Approve claim {currentClaim.claimNumber} for resolution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approvalNotes">Notes (Optional)</Label>
              <Textarea
                id="approvalNotes"
                value={approvalNotes}
                onChange={(event) => setApprovalNotes(event.target.value)}
                placeholder="Add any notes for the approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Approving...
                </>
              ) : (
                'Approve Claim'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Claim</DialogTitle>
            <DialogDescription>
              Deny claim {currentClaim.claimNumber}. A reason is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="denialReason">
                Denial Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="denialReason"
                value={denialReason}
                onChange={(event) => setDenialReason(event.target.value)}
                placeholder="Explain why the claim is being denied..."
                rows={3}
                className={denialReason.length > 0 && denialReason.length < 10 ? 'border-destructive' : ''}
              />
              {denialReason.length > 0 && denialReason.length < 10 && (
                <p className="text-destructive text-xs">Reason must be at least 10 characters</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="denialNotes">Additional Notes (Optional)</Label>
              <Textarea
                id="denialNotes"
                value={denialNotes}
                onChange={(event) => setDenialNotes(event.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={denyMutation.isPending || denialReason.length < 10}
            >
              {denyMutation.isPending ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Denying...
                </>
              ) : (
                'Deny Claim'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Claim</DialogTitle>
            <DialogDescription>
              Complete the resolution for claim {currentClaim.claimNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolutionType">
                Resolution Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={resolutionType}
                onValueChange={(value) =>
                  setResolutionType(
                    isWarrantyClaimResolutionTypeValue(value) ? value : 'repair'
                  )
                }
              >
                <SelectTrigger id="resolutionType">
                  <SelectValue placeholder="Select resolution type" />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {resolutionType === 'warranty_extension' && (
              <div className="space-y-2">
                <Label htmlFor="extensionMonths">Extension Months</Label>
                <Input
                  id="extensionMonths"
                  type="number"
                  min={1}
                  max={120}
                  value={extensionMonths}
                  onChange={(event) => setExtensionMonths(event.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="resolutionCost">Cost (AUD) (Optional)</Label>
              <Input
                id="resolutionCost"
                type="number"
                min={0}
                step={0.01}
                value={resolutionCost}
                onChange={(event) => setResolutionCost(event.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolutionNotes">Resolution Notes (Optional)</Label>
              <Textarea
                id="resolutionNotes"
                value={resolutionNotes}
                onChange={(event) => setResolutionNotes(event.target.value)}
                placeholder="Details about the resolution..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={resolveMutation.isPending}>
              {resolveMutation.isPending ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Resolving...
                </>
              ) : (
                'Resolve Claim'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (children) {
    return <>{children({ headerActions, content })}</>;
  }

  return content;
}
