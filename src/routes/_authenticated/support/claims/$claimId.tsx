/**
 * Warranty Claim Detail Page
 *
 * Displays full claim details with status timeline, approval workflow,
 * and resolution form.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-006c
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-006c.wireframe.md
 */
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import {
  ArrowLeft,
  FileWarning,
  Shield,
  User,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  DollarSign,
  Battery,
  Wrench,
  RefreshCw,
  Banknote,
  CalendarPlus,
} from 'lucide-react';

import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { getWarrantyClaim } from '@/server/functions/warranty/warranty-claims';
import {
  useWarrantyClaim,
  useUpdateClaimStatus,
  useApproveClaim,
  useDenyClaim,
  useResolveClaim,
  type WarrantyClaimStatusValue,
  type WarrantyClaimTypeValue,
  type WarrantyClaimResolutionTypeValue,
} from '@/hooks/warranty';
import {
  claimStatusConfig,
  claimTypeConfig,
  resolutionTypeConfig,
  formatClaimDateTime,
  formatClaimCost,
  getSlaDueStatus,
} from '@/lib/warranty/claims-utils';

export const Route = createFileRoute('/_authenticated/support/claims/$claimId')({
  loader: async ({ params }) => {
    const claim = await getWarrantyClaim({ data: { claimId: params.claimId } });
    if (!claim) {
      throw new Error('Claim not found');
    }
    return claim;
  },
  component: ClaimDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/claims" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Claim Details"
        description="Loading warranty claim information..."
      />
      <PageLayout.Content>
        <SupportDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// RESOLUTION OPTIONS
// ============================================================================

const RESOLUTION_OPTIONS: {
  value: WarrantyClaimResolutionTypeValue;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: 'repair', label: 'Repair', icon: <Wrench className="h-4 w-4" /> },
  { value: 'replacement', label: 'Replace', icon: <RefreshCw className="h-4 w-4" /> },
  { value: 'refund', label: 'Refund', icon: <Banknote className="h-4 w-4" /> },
  {
    value: 'warranty_extension',
    label: 'Warranty Extension',
    icon: <CalendarPlus className="h-4 w-4" />,
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

function ClaimDetailPage() {
  const navigate = Route.useNavigate();
  const initialClaim = Route.useLoaderData();

  // Use query for live updates after mutations
  const { data: claim } = useWarrantyClaim(initialClaim.id);
  const currentClaim = claim ?? initialClaim;

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  // Form states
  const [approvalNotes, setApprovalNotes] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [denialNotes, setDenialNotes] = useState('');
  const [resolutionType, setResolutionType] = useState<WarrantyClaimResolutionTypeValue>('repair');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionCost, setResolutionCost] = useState('');
  const [extensionMonths, setExtensionMonths] = useState('12');

  // Mutations
  const updateStatusMutation = useUpdateClaimStatus();
  const approveMutation = useApproveClaim();
  const denyMutation = useDenyClaim();
  const resolveMutation = useResolveClaim();

  // Derived values
  const statusConfig = claimStatusConfig[currentClaim.status as WarrantyClaimStatusValue];
  const typeConfig = claimTypeConfig[currentClaim.claimType as WarrantyClaimTypeValue];

  // SLA status
  const responseSla = currentClaim.slaTracking?.responseDueAt
    ? getSlaDueStatus(
        currentClaim.slaTracking.responseDueAt,
        currentClaim.slaTracking?.respondedAt ?? null,
        currentClaim.submittedAt
      )
    : null;
  const resolutionSla = currentClaim.slaTracking?.resolutionDueAt
    ? getSlaDueStatus(
        currentClaim.slaTracking.resolutionDueAt,
        currentClaim.slaTracking?.resolvedAt ?? null,
        currentClaim.submittedAt
      )
    : null;

  // Can actions
  const canApprove = currentClaim.status === 'submitted' || currentClaim.status === 'under_review';
  const canDeny = currentClaim.status === 'submitted' || currentClaim.status === 'under_review';
  const canResolve = currentClaim.status === 'approved';
  const canStartReview = currentClaim.status === 'submitted';

  // Handlers
  const handleStartReview = async () => {
    await updateStatusMutation.mutateAsync({
      claimId: currentClaim.id,
      status: 'under_review',
    });
  };

  const handleApprove = async () => {
    await approveMutation.mutateAsync({
      claimId: currentClaim.id,
      notes: approvalNotes.trim() || undefined,
    });
    setApproveDialogOpen(false);
    setApprovalNotes('');
  };

  const handleDeny = async () => {
    if (!denialReason.trim()) return;
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
    await resolveMutation.mutateAsync({
      claimId: currentClaim.id,
      resolutionType,
      resolutionNotes: resolutionNotes.trim() || undefined,
      cost: resolutionCost ? parseFloat(resolutionCost) : undefined,
      extensionMonths:
        resolutionType === 'warranty_extension' ? parseInt(extensionMonths, 10) : undefined,
    });
    setResolveDialogOpen(false);
    setResolutionNotes('');
    setResolutionCost('');
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
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
                <span>{currentClaim.claimNumber}</span>
                <Badge className={statusConfig?.color ?? ''}>
                  {statusConfig?.label ?? currentClaim.status}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {typeConfig?.label ?? currentClaim.claimType}
              </p>
            </div>
          </div>
        }
        actions={
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
        }
      />

      <PageLayout.Content>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Claim Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Claim Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                  Customer
                </Label>
                <div className="flex items-center gap-2">
                  <User className="text-muted-foreground h-4 w-4" />
                  <Link
                    to="/customers/$customerId"
                    params={{ customerId: currentClaim.customerId }}
                    className="text-primary hover:underline"
                  >
                    {currentClaim.customer?.name ?? 'Unknown Customer'}
                  </Link>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                  Product
                </Label>
                <div className="flex items-center gap-2">
                  <Package className="text-muted-foreground h-4 w-4" />
                  <Link
                    to="/products/$productId"
                    params={{ productId: currentClaim.product?.id ?? '' }}
                    className="text-primary hover:underline"
                  >
                    {currentClaim.product?.name ?? 'Unknown Product'}
                  </Link>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                  Warranty
                </Label>
                <div className="flex items-center gap-2">
                  <Shield className="text-muted-foreground h-4 w-4" />
                  <Link
                    to="/support/warranties/$warrantyId"
                    params={{ warrantyId: currentClaim.warrantyId }}
                    className="text-primary hover:underline"
                  >
                    {currentClaim.warranty?.warrantyNumber}
                  </Link>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                  Submitted
                </Label>
                <div className="flex items-center gap-2">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span>{formatClaimDateTime(currentClaim.submittedAt)}</span>
                </div>
              </div>

              {currentClaim.cycleCountAtClaim !== null && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                    Cycle Count at Claim
                  </Label>
                  <div className="flex items-center gap-2">
                    <Battery className="text-muted-foreground h-4 w-4" />
                    <span>{currentClaim.cycleCountAtClaim?.toLocaleString()} cycles</span>
                  </div>
                </div>
              )}

              {currentClaim.cost !== null && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                    Resolution Cost
                  </Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="text-muted-foreground h-4 w-4" />
                    <span>{formatClaimCost(currentClaim.cost)}</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                Description
              </Label>
              <p className="text-sm whitespace-pre-wrap">{currentClaim.description}</p>
            </div>

            {currentClaim.resolutionType && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                    Resolution
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        resolutionTypeConfig[
                          currentClaim.resolutionType as WarrantyClaimResolutionTypeValue
                        ]?.color ?? ''
                      }
                    >
                      {resolutionTypeConfig[
                        currentClaim.resolutionType as WarrantyClaimResolutionTypeValue
                      ]?.label ?? currentClaim.resolutionType}
                    </Badge>
                    {currentClaim.resolutionNotes && (
                      <span className="text-muted-foreground text-sm">
                        - {currentClaim.resolutionNotes}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {currentClaim.denialReason && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                    Denial Reason
                  </Label>
                  <p className="text-destructive text-sm">{currentClaim.denialReason}</p>
                </div>
              </>
            )}

            {currentClaim.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                    Notes
                  </Label>
                  <pre className="text-muted-foreground font-sans text-sm whitespace-pre-wrap">
                    {currentClaim.notes}
                  </pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* SLA & Timeline Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              SLA Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Response SLA */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                Response SLA
              </Label>
              {currentClaim.slaTracking?.respondedAt ? (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Responded {formatClaimDateTime(currentClaim.slaTracking.respondedAt)}</span>
                </div>
              ) : responseSla ? (
                <div className="flex items-center gap-2 text-sm">
                  {responseSla.status === 'breached' ? (
                    <AlertTriangle className="text-destructive h-4 w-4" />
                  ) : responseSla.status === 'at_risk' ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Clock className="text-muted-foreground h-4 w-4" />
                  )}
                  <span
                    className={
                      responseSla.status === 'breached'
                        ? 'text-destructive'
                        : responseSla.status === 'at_risk'
                          ? 'text-yellow-600'
                          : ''
                    }
                  >
                    {responseSla.label}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">No SLA configured</span>
              )}
            </div>

            {/* Resolution SLA */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                Resolution SLA
              </Label>
              {currentClaim.slaTracking?.resolvedAt ? (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Resolved {formatClaimDateTime(currentClaim.slaTracking.resolvedAt)}</span>
                </div>
              ) : resolutionSla ? (
                <div className="flex items-center gap-2 text-sm">
                  {resolutionSla.status === 'breached' ? (
                    <AlertTriangle className="text-destructive h-4 w-4" />
                  ) : resolutionSla.status === 'at_risk' ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Clock className="text-muted-foreground h-4 w-4" />
                  )}
                  <span
                    className={
                      resolutionSla.status === 'breached'
                        ? 'text-destructive'
                        : resolutionSla.status === 'at_risk'
                          ? 'text-yellow-600'
                          : ''
                    }
                  >
                    {resolutionSla.label}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">No SLA configured</span>
              )}
            </div>

            <Separator />

            {/* Timeline */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                Timeline
              </Label>
              <div className="space-y-3 pt-2">
                <TimelineItem
                  icon={<FileWarning className="h-4 w-4" />}
                  title="Submitted"
                  date={currentClaim.submittedAt}
                  isComplete
                />
                <TimelineItem
                  icon={<Clock className="h-4 w-4" />}
                  title="Under Review"
                  date={currentClaim.slaTracking?.respondedAt ?? undefined}
                  isComplete={currentClaim.status !== 'under_review'}
                />
                {(currentClaim.status === 'approved' || currentClaim.status === 'resolved') && (
                  <TimelineItem
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    title="Approved"
                    date={currentClaim.approvedAt ?? undefined}
                    user={currentClaim.approvedByUser?.name ?? currentClaim.approvedByUser?.email}
                    isComplete
                  />
                )}
                {currentClaim.status === 'denied' && (
                  <TimelineItem
                    icon={<XCircle className="h-4 w-4" />}
                    title="Denied"
                    date={currentClaim.updatedAt}
                    isComplete
                    variant="destructive"
                  />
                )}
                {currentClaim.status === 'resolved' && (
                  <TimelineItem
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    title="Resolved"
                    date={currentClaim.resolvedAt ?? undefined}
                    isComplete
                    variant="success"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      </PageLayout.Content>

      {/* Approve Dialog */}
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
                onChange={(e) => setApprovalNotes(e.target.value)}
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

      {/* Deny Dialog */}
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
                onChange={(e) => setDenialReason(e.target.value)}
                placeholder="Explain why the claim is being denied..."
                rows={3}
                className={
                  denialReason.length > 0 && denialReason.length < 10 ? 'border-destructive' : ''
                }
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
                onChange={(e) => setDenialNotes(e.target.value)}
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

      {/* Resolve Dialog */}
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
                  setResolutionType(value as WarrantyClaimResolutionTypeValue)
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
                  onChange={(e) => setExtensionMonths(e.target.value)}
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
                onChange={(e) => setResolutionCost(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolutionNotes">Resolution Notes (Optional)</Label>
              <Textarea
                id="resolutionNotes"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
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
    </PageLayout>
  );
}

// ============================================================================
// TIMELINE ITEM
// ============================================================================

interface TimelineItemProps {
  icon: React.ReactNode;
  title: string;
  date?: string | Date | null;
  user?: string | null;
  isComplete?: boolean;
  variant?: 'default' | 'success' | 'destructive';
}

function TimelineItem({
  icon,
  title,
  date,
  user,
  isComplete,
  variant = 'default',
}: TimelineItemProps) {
  const colorClasses = {
    default: isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
    success: 'bg-green-500 text-white',
    destructive: 'bg-destructive text-destructive-foreground',
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`rounded-full p-1.5 ${colorClasses[variant]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {date && <p className="text-muted-foreground text-xs">{formatClaimDateTime(date)}</p>}
        {user && <p className="text-muted-foreground text-xs">by {user}</p>}
      </div>
    </div>
  );
}
