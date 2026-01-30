'use client';

/**
 * Warranty Claim Detail Container
 *
 * Handles data fetching, mutations, and dialog state for claim detail view.
 *
 * @source claim from useWarrantyClaim hook
 */

import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  FileWarning,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Wrench,
  RefreshCw,
  Banknote,
  CalendarPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { ErrorState } from '@/components/shared/error-state';
import {
  useWarrantyClaim,
  useUpdateClaimStatus,
  useApproveClaim,
  useDenyClaim,
  useResolveClaim,
  type WarrantyClaimResolutionTypeValue,
  type WarrantyClaimStatusValue,
  type WarrantyClaimTypeValue,
} from '@/hooks/warranty';
import {
  claimStatusConfig,
  claimTypeConfig,
  getSlaDueStatus,
} from '@/lib/warranty/claims-utils';
import { WarrantyClaimDetailView } from './warranty-claim-detail-view';

export interface WarrantyClaimDetailContainerRenderProps {
  headerTitle: React.ReactNode;
  headerActions?: React.ReactNode;
  content: React.ReactNode;
}

export interface WarrantyClaimDetailContainerProps {
  claimId: string;
  children?: (props: WarrantyClaimDetailContainerRenderProps) => React.ReactNode;
}

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
  const navigate = useNavigate();

  const { data: claim, isLoading, error, refetch } = useWarrantyClaim(claimId);
  const currentClaim = claim ?? null;

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

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

  const statusConfig = useMemo(() => {
    if (!currentClaim) return null;
    return claimStatusConfig[currentClaim.status as WarrantyClaimStatusValue];
  }, [currentClaim]);

  const typeConfig = useMemo(() => {
    if (!currentClaim) return null;
    return claimTypeConfig[currentClaim.claimType as WarrantyClaimTypeValue];
  }, [currentClaim]);

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

  const headerTitle = (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          navigate({
            to: '/support/claims',
            search: { page: 1, pageSize: 20, sortBy: 'submittedAt', sortOrder: 'desc' },
          })
        }
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div>
        <div className="flex items-center gap-2">
          <FileWarning className="text-muted-foreground h-5 w-5" />
          <span>{currentClaim?.claimNumber ?? 'Claim Details'}</span>
          {statusConfig && (
            <Badge className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {typeConfig?.label ?? currentClaim?.claimType ?? ''}
        </p>
      </div>
    </div>
  );

  const headerActions = currentClaim ? (
    <div className="flex items-center gap-2">
      {canStartReview && (
        <Button
          variant="outline"
          onClick={handleStartReview}
          disabled={updateStatusMutation.isPending}
        >
          {updateStatusMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Clock className="mr-2 h-4 w-4" />
          )}
          Start Review
        </Button>
      )}
      {canApprove && (
        <Button variant="default" onClick={() => setApproveDialogOpen(true)}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Approve
        </Button>
      )}
      {canDeny && (
        <Button variant="destructive" onClick={() => setDenyDialogOpen(true)}>
          <XCircle className="mr-2 h-4 w-4" />
          Deny
        </Button>
      )}
      {canResolve && (
        <Button variant="default" onClick={() => setResolveDialogOpen(true)}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Resolve
        </Button>
      )}
    </div>
  ) : undefined;

  if (error) {
    const content = (
      <ErrorState
        title="Failed to load claim"
        message={error instanceof Error ? error.message : 'Unknown error'}
        onRetry={() => refetch()}
      />
    );
    return children ? <>{children({ headerTitle, headerActions: undefined, content })}</> : content;
  }

  if (isLoading || !currentClaim) {
    const content = <SupportDetailSkeleton />;
    return children ? <>{children({ headerTitle, headerActions: undefined, content })}</> : content;
  }

  const content = (
    <>
      <WarrantyClaimDetailView
        claim={currentClaim}
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
                onValueChange={(value) => setResolutionType(value as WarrantyClaimResolutionTypeValue)}
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
    return <>{children({ headerTitle, headerActions, content })}</>;
  }

  return content;
}
