'use client';

/**
 * Warranty Detail View
 *
 * Pure UI component for warranty details, claims, and extensions.
 */

import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Calendar,
  User,
  Package,
  BellOff,
  Bell,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileWarning,
  Plus,
  ExternalLink,
  TicketIcon,
  PanelRight,
  X,
  Shield,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatusBadge, EntityHeader, DetailGrid, DetailSection, MetricCard } from '@/components/shared';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { getActivitiesFeedSearch } from '@/lib/activities';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { WarrantyClaimFormDialog } from '@/components/domain/warranty/dialogs/warranty-claim-form-dialog';
import { ClaimApprovalDialog } from '@/components/domain/warranty/dialogs/claim-approval-dialog';
import { ExtendWarrantyDialog } from '@/components/domain/warranty/dialogs/extend-warranty-dialog';
import { WarrantyExtensionHistory } from '@/components/domain/warranty/views/warranty-extension-history';
import {
  claimStatusConfig,
  claimTypeConfig,
  formatClaimDate,
  formatClaimCost,
} from '@/lib/warranty/claims-utils';
import { isWarrantyClaimTypeValue } from '@/lib/schemas/warranty';
import { useAlertDismissals, generateAlertIdWithValue } from '@/hooks/_shared/use-alert-dismissals';
import { useWarrantyHeaderActions } from '@/hooks/warranty';
import { formatDateAustralian, getDaysUntilExpiry, getWarrantyStatusConfigForEntityHeader } from '@/lib/warranty';
import { getSummaryMetricSubtitle } from '@/lib/metrics/metric-display';

// ============================================================================
// TYPES
// ============================================================================

// Import types from schemas per SCHEMA-TRACE.md
import type {
  WarrantyDetail,
  WarrantyClaimListItem,
  WarrantyPendingServiceReview,
  WarrantyDetailViewProps,
} from '@/lib/schemas/warranty';

// Re-export for convenience
export type { WarrantyDetail as WarrantyDetailViewWarranty, WarrantyClaimListItem, WarrantyDetailViewProps };

// ============================================================================
// HELPERS
// ============================================================================

// Local wrapper for backward compatibility with existing code
function formatDate(dateString: string): string {
  return formatDateAustralian(dateString, 'numeric');
}

function getExpiryBadge(daysUntilExpiry: number) {
  if (daysUntilExpiry <= 0) {
    return <StatusBadge status="expired" variant="error" />;
  }
  if (daysUntilExpiry <= 7) {
    return <StatusBadge status={`${daysUntilExpiry} days left`} variant="error" />;
  }
  if (daysUntilExpiry <= 30) {
    return <StatusBadge status={`${daysUntilExpiry} days left`} variant="pending" />;
  }
  if (daysUntilExpiry <= 90) {
    return <StatusBadge status={`${daysUntilExpiry} days left`} variant="warning" />;
  }
  return <StatusBadge status={`${daysUntilExpiry} days left`} variant="neutral" />;
}

function getServiceLinkagePresentation(
  status: WarrantyDetail['serviceLinkageStatus']
): {
  label: string;
  description: string;
  badgeClassName: string;
} {
  switch (status) {
    case 'linked':
      return {
        label: 'Linked',
        description: 'This warranty is linked to a live service-system record.',
        badgeClassName:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
      };
    case 'pending_review':
      return {
        label: 'Pending Review',
        description: 'A linkage review is blocking automatic system assignment.',
        badgeClassName:
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
      };
    case 'unlinked':
      return {
        label: 'Unlinked',
        description: 'This warranty is not linked to a service-system record yet.',
        badgeClassName:
          'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300',
      };
    case 'owner_missing':
      return {
        label: 'Owner Missing',
        description: 'A service system exists, but there is no current owner assigned yet.',
        badgeClassName:
          'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
      };
  }
}

function formatServiceReviewReason(
  reasonCode: WarrantyPendingServiceReview['reasonCode']
): string {
  return reasonCode.replaceAll('_', ' ');
}

// ============================================================================
// VIEW
// ============================================================================

export function WarrantyDetailView({
  warranty,
  headerActionsInLayout = false,
  claims,
  claimSummary,
  claimSummaryState = 'loading',
  extensions,
  certificateStatus,
  isClaimsLoading,
  isClaimsError = false,
  isClaimSummaryLoading = false,
  isExtensionsLoading,
  isExtensionsError,
  isCertificateLoading,
  isOptOutUpdating,
  isSubmittingClaim,
  isSubmittingApproval,
  isSubmittingExtend,
  isClaimDialogOpen,
  isApprovalDialogOpen,
  isExtendDialogOpen,
  pendingClaimAction,
  selectedClaimForApproval,
  onClaimRowClick,
  onResolveClaimRow,
  onReviewClaim,
  onClaimDialogOpenChange,
  onApprovalDialogOpenChange,
  onExtendDialogOpenChange,
  onRetryClaims,
  onRetryExtensions,
  onClaimsSuccess,
  onExtensionsSuccess,
  onSubmitClaim,
  onApproveClaim,
  onDenyClaim,
  onRequestInfoClaim,
  onExtendWarranty,
  onToggleOptOut,
  certificateError,
  onRetryCertificate,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  systemActivities = [],
  systemActivitiesLoading = false,
  systemActivitiesError,
  onLogActivity,
  onScheduleFollowUp,
  onDelete,
  onDownloadCertificate,
  onGenerateCertificate,
  onRegenerateCertificate,
  isCertificateGenerating = false,
  isCertificateRegenerating = false,
  onOpenTransferOwnership,
  isTransferringOwnership = false,
}: WarrantyDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const daysUntilExpiry = getDaysUntilExpiry(warranty.expiryDate);
  const serviceLinkage = getServiceLinkagePresentation(warranty.serviceLinkageStatus);
  const canFileClaim = warranty.status === 'active' || warranty.status === 'expiring_soon';
  const approvalClaim = selectedClaimForApproval ?? null;
  const { dismiss, isAlertDismissed } = useAlertDismissals();

  const coverageProgress = useMemo(() => {
    const start = new Date(warranty.registrationDate).getTime();
    const end = new Date(warranty.expiryDate).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
    const progress = ((now - start) / (end - start)) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }, [now, warranty.expiryDate, warranty.registrationDate]);

  const alerts = useMemo(() => {
    const items: Array<{
      id: string;
      tone: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      actionLabel?: string;
      onAction?: () => void;
    }> = [];

    if (daysUntilExpiry <= 0 || warranty.status === 'expired') {
      const daysSinceExpiry = Math.abs(daysUntilExpiry);
      const canExtendExpired = daysSinceExpiry <= 90;
      const daysLeftToExtend = canExtendExpired ? 90 - daysSinceExpiry : null;

      items.push({
        id: generateAlertIdWithValue('warranty', warranty.id, 'expired', daysSinceExpiry),
        tone: 'critical',
        title: 'Warranty expired',
        description:
          daysUntilExpiry === 0
            ? 'Warranty expires today.'
            : `Warranty expired ${daysSinceExpiry} day${daysSinceExpiry === 1 ? '' : 's'} ago.${
                canExtendExpired && daysLeftToExtend !== null
                  ? ` Can still be extended within the 90-day grace period (${daysLeftToExtend} days remaining).`
                  : daysSinceExpiry > 90
                  ? ' Cannot be extended (90-day grace period has passed).'
                  : ''
              }`,
        actionLabel: canExtendExpired ? 'Extend warranty' : 'Review claims',
        onAction: canExtendExpired
          ? () => onExtendDialogOpenChange(true)
          : () => setActiveTab('claims'),
      });
    }

    if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
      items.push({
        id: generateAlertIdWithValue('warranty', warranty.id, 'expiring_soon', daysUntilExpiry),
        tone: 'warning',
        title: 'Warranty expiring soon',
        description: `Warranty expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}.`,
        actionLabel: 'Extend warranty',
        onAction: () => onExtendDialogOpenChange(true),
      });
    }

    if (warranty.expiryAlertOptOut) {
      items.push({
        id: generateAlertIdWithValue('warranty', warranty.id, 'alerts_disabled', 1),
        tone: 'info',
        title: 'Expiry alerts disabled',
        description: 'You will not receive expiry reminders for this warranty.',
        actionLabel: 'Enable alerts',
        onAction: () => onToggleOptOut(false),
      });
    }

    return items;
  }, [daysUntilExpiry, warranty.status, warranty.id, onExtendDialogOpenChange, onToggleOptOut, warranty.expiryAlertOptOut]);

  const visibleAlerts = alerts.filter((alert) => !isAlertDismissed(alert.id)).slice(0, 3);

  const sidebarContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Purchased Via</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Link
            to="/customers/$customerId"
            params={{ customerId: warranty.customerId }}
            search={{}}
            className="text-primary hover:underline"
          >
            {warranty.customerName ?? 'Unknown Customer'}
          </Link>
          <div className="text-muted-foreground">Warranty #{warranty.warrantyNumber}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Owner Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="font-medium">
            {warranty.ownerRecord?.fullName ?? 'Not captured yet'}
          </div>
          {warranty.ownerRecord?.email ? (
            <div className="text-muted-foreground">{warranty.ownerRecord.email}</div>
          ) : null}
          {warranty.ownerRecord?.phone ? (
            <div className="text-muted-foreground">{warranty.ownerRecord.phone}</div>
          ) : null}
          {warranty.ownerRecord?.address ? (
            <div className="text-muted-foreground">
              {[
                warranty.ownerRecord.address.street1,
                warranty.ownerRecord.address.city,
                warranty.ownerRecord.address.state,
                warranty.ownerRecord.address.postalCode,
              ]
                .filter(Boolean)
                .join(', ')}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Service System</CardTitle>
          <CardDescription>
            Canonical installed-system record used for ownership and support context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('rounded-full', serviceLinkage.badgeClassName)}>
              {serviceLinkage.label}
            </Badge>
          </div>
          <div className="text-muted-foreground">{serviceLinkage.description}</div>
          {warranty.serviceSystem ? (
            <>
              <div className="space-y-1">
                <Link
                  to="/support/service-systems/$serviceSystemId"
                  params={{ serviceSystemId: warranty.serviceSystem.id }}
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  {warranty.serviceSystem.displayName}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                {warranty.serviceSystem.siteAddressLabel ? (
                  <div className="text-muted-foreground">
                    {warranty.serviceSystem.siteAddressLabel}
                  </div>
                ) : null}
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Current owner</div>
                <div className="font-medium">
                  {warranty.currentOwner?.fullName ?? warranty.ownerRecord?.fullName ?? 'Not assigned'}
                </div>
                {warranty.currentOwner?.email ? (
                  <div className="text-muted-foreground">{warranty.currentOwner.email}</div>
                ) : null}
              </div>
              {warranty.systemHistoryPreview.length > 0 ? (
                <div className="rounded-md border border-dashed p-3">
                  <div className="text-muted-foreground mb-2 text-xs uppercase">
                    Recent system history
                  </div>
                  <div className="space-y-2">
                    {warranty.systemHistoryPreview.slice(0, 2).map((entry) => (
                      <div key={entry.id}>
                        <div className="font-medium">
                          {entry.description ?? entry.action.replaceAll('_', ' ')}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {formatDate(entry.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {onOpenTransferOwnership ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  onClick={onOpenTransferOwnership}
                  disabled={isTransferringOwnership}
                >
                  {isTransferringOwnership ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    'Transfer Ownership'
                  )}
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm" className="w-full justify-center">
                <Link
                  to="/support/service-systems/$serviceSystemId"
                  params={{ serviceSystemId: warranty.serviceSystem.id }}
                >
                  Open System Detail
                </Link>
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="font-medium">No service system linked yet</div>
                <div className="text-muted-foreground">
                  Resolve the linkage review queue or complete the external migration workflow before relying on system ownership here.
                </div>
              </div>
              {warranty.pendingServiceReview ? (
                <Button asChild variant="outline" size="sm" className="w-full justify-center">
                  <Link
                    to="/support/service-linkage-reviews/$reviewId"
                    params={{ reviewId: warranty.pendingServiceReview.id }}
                  >
                    Open Pending Review
                  </Link>
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Link
            to="/products/$productId"
            params={{ productId: warranty.productId }}
            className="text-primary hover:underline"
          >
            {warranty.productName ?? 'Unknown Product'}
          </Link>
          <div className="text-muted-foreground">
            Serial:{' '}
            {warranty.productSerial ? (
              <Link
                to="/inventory/browser"
                search={{ view: 'serialized', serializedSearch: warranty.productSerial, page: 1 }}
                className="font-mono text-primary hover:underline"
              >
                {warranty.productSerial}
              </Link>
            ) : (
              'N/A'
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Coverage Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Source</span>
            <span>{warranty.sourceEntitlement ? 'Delivery entitlement' : 'Legacy/manual'}</span>
          </div>
          {warranty.sourceEntitlement ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order</span>
                <span>{warranty.sourceEntitlement.orderNumber ?? 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shipment</span>
                <span>{warranty.sourceEntitlement.shipmentNumber ?? 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delivered</span>
                <span>{formatDate(warranty.sourceEntitlement.deliveredAt)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Policy</span>
                <span>{warranty.policyName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registered</span>
                <span>{formatDate(warranty.registrationDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expires</span>
                <span>{formatDate(warranty.expiryDate)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Manage expiry alert notifications for this warranty
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="opt-out-toggle"
                className="flex cursor-pointer items-center gap-2"
              >
                {warranty.expiryAlertOptOut ? (
                  <BellOff className="text-muted-foreground h-4 w-4" />
                ) : (
                  <Bell className="text-primary h-4 w-4" />
                )}
                <span>Expiry Alerts</span>
              </Label>
              <p className="text-muted-foreground text-sm">
                {warranty.expiryAlertOptOut
                  ? 'Alerts are disabled for this warranty'
                  : 'Receive alerts at 90, 60, and 30 days before expiry'}
              </p>
            </div>
            <Switch
              id="opt-out-toggle"
              checked={!warranty.expiryAlertOptOut}
              onCheckedChange={(checked) => onToggleOptOut(!checked)}
              disabled={isOptOutUpdating}
              aria-label={warranty.expiryAlertOptOut ? 'Enable expiry alerts' : 'Disable expiry alerts'}
            />
          </div>

          {isOptOutUpdating && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating...</span>
            </div>
          )}

          <Separator />

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs tracking-wider uppercase">
              Last Alert Sent
            </Label>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="text-muted-foreground h-4 w-4" />
              <span>
                {warranty.lastExpiryAlertSent
                  ? formatDate(warranty.lastExpiryAlertSent)
                  : 'No alerts sent yet'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {warranty.expiryAlertOptOut ? (
              <>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-muted-foreground">
                  You will not receive expiry reminders for this warranty
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Expiry reminders are active</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Certificate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {certificateError
              ? 'Certificate status is temporarily unavailable.'
              : isCertificateLoading
              ? 'Checking certificate status...'
              : certificateStatus?.exists
                ? 'Certificate available in the Actions menu.'
                : 'No certificate generated yet.'}
          </p>
          {certificateError && onRetryCertificate && (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>{certificateError}</span>
                <Button variant="outline" size="sm" onClick={onRetryCertificate}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Build EntityHeader actions via shared hook
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <main className="min-w-0 space-y-6">
        {/* Zone 1: Header */}
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

          {/* Key Metrics - Using shared MetricCard (per METRIC-CARD-STANDARDS.md) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard
              variant="compact"
              title="Days Left"
              value={daysUntilExpiry > 0 ? `${daysUntilExpiry}d` : 'Expired'}
              icon={Clock}
              iconClassName={
                daysUntilExpiry <= 0
                  ? 'text-destructive'
                  : daysUntilExpiry <= 30
                  ? 'text-warning'
                  : 'text-muted-foreground'
              }
              subtitle={daysUntilExpiry > 0 ? `Expires ${formatDate(warranty.expiryDate)}` : undefined}
              alert={daysUntilExpiry <= 0 || daysUntilExpiry <= 30}
            />
            <MetricCard
              variant="compact"
              title="Claims"
              value={claimSummaryState === 'ready' ? claimSummary?.totalClaims ?? 0 : '—'}
              icon={TicketIcon}
              iconClassName="text-muted-foreground"
              isLoading={isClaimsLoading || isClaimSummaryLoading}
              subtitle={getSummaryMetricSubtitle({
                summaryState: claimSummaryState,
                readySubtitle:
                  claimSummaryState === 'ready' && (claimSummary?.pendingClaims ?? 0) > 0
                    ? `${claimSummary?.pendingClaims ?? 0} pending`
                    : undefined,
                unavailableSubtitle: 'Claim summary unavailable',
              })}
            />
            <MetricCard
              variant="compact"
              title="Covered Items"
              value={warranty.items.length}
              icon={Shield}
              iconClassName="text-muted-foreground"
            />
          </div>
        </section>

        {/* Zone 2: Progress Indicator */}
        <section
          className="rounded-lg border bg-background p-4"
          role="progressbar"
          aria-label={`Coverage progress: ${coverageProgress}%`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Coverage timeline</div>
              <div className="text-xs text-muted-foreground">
                Registered {formatDate(warranty.registrationDate)} · Expires {formatDate(warranty.expiryDate)}
              </div>
            </div>
            <div className="text-sm font-medium">
              {coverageProgress}% used
            </div>
          </div>
          <Progress value={coverageProgress} className="mt-3 h-2" />
        </section>

        {visibleAlerts.length > 0 && (
          <section className="space-y-2">
            {visibleAlerts.map((alert) => (
              <Alert
                key={alert.id}
                variant={alert.tone === 'critical' ? 'destructive' : 'default'}
              >
                <AlertDescription className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{alert.title}</div>
                    <div className="text-sm text-muted-foreground">{alert.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.actionLabel && alert.onAction && (
                      <Button variant="outline" size="sm" onClick={alert.onAction}>
                        {alert.actionLabel}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Dismiss alert"
                      onClick={() => dismiss(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </section>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="claims" className="gap-2">
              Claims
              {!isClaimsError ? (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {claims.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="warranty-activity">Warranty Activity</TabsTrigger>
            <TabsTrigger value="system-history">System History</TabsTrigger>
          </TabsList>

          {activeTab === 'overview' && (
            <TabsContent value="overview" className="mt-4">
              <div className="space-y-6">
                {/* Quick Answer Section */}
                <div className="rounded-lg border border-dashed bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {getExpiryBadge(daysUntilExpiry)}
                    <Badge
                      variant="outline"
                      className={cn('rounded-full', serviceLinkage.badgeClassName)}
                    >
                      {serviceLinkage.label}
                    </Badge>
                    <span className="text-muted-foreground">
                      Policy: {warranty.policyName}
                    </span>
                    <span className="text-muted-foreground">
                      Expires {formatDate(warranty.expiryDate)}
                    </span>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Service Mission Control</CardTitle>
                    <CardDescription>
                      See commercial lineage, current ownership, service linkage health, and what
                      to do next without leaving the warranty workflow.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-md border p-3">
                        <div className="text-muted-foreground mb-1 text-xs uppercase">
                          Linkage Status
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('rounded-full', serviceLinkage.badgeClassName)}
                        >
                          {serviceLinkage.label}
                        </Badge>
                        <div className="text-muted-foreground mt-2 text-sm">
                          {serviceLinkage.description}
                        </div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-muted-foreground mb-1 text-xs uppercase">
                          Current Owner
                        </div>
                        <div className="font-medium">
                          {warranty.currentOwner?.fullName ?? 'No current owner assigned'}
                        </div>
                        <div className="text-muted-foreground mt-2 text-sm">
                          {warranty.currentOwner?.email ??
                            warranty.currentOwner?.phone ??
                            'Use transfer or review flows to update ownership.'}
                        </div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-muted-foreground mb-1 text-xs uppercase">
                          Service System
                        </div>
                        {warranty.serviceSystem ? (
                          <>
                            <Link
                              to="/support/service-systems/$serviceSystemId"
                              params={{ serviceSystemId: warranty.serviceSystem.id }}
                              className="font-medium text-primary hover:underline"
                            >
                              {warranty.serviceSystem.displayName}
                            </Link>
                            <div className="text-muted-foreground mt-2 text-sm">
                              {warranty.serviceSystem.siteAddressLabel ?? 'No site address captured'}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium">No system linked</div>
                            <div className="text-muted-foreground mt-2 text-sm">
                              This warranty is still outside the canonical installed-system graph.
                            </div>
                          </>
                        )}
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-muted-foreground mb-1 text-xs uppercase">
                          Next Step
                        </div>
                        {warranty.pendingServiceReview ? (
                          <>
                            <div className="font-medium">
                              Review {formatServiceReviewReason(warranty.pendingServiceReview.reasonCode)}
                            </div>
                            <Button asChild variant="ghost" size="sm" className="mt-2 h-auto px-0">
                              <Link
                                to="/support/service-linkage-reviews/$reviewId"
                                params={{ reviewId: warranty.pendingServiceReview.id }}
                              >
                                Open linkage review
                              </Link>
                            </Button>
                          </>
                        ) : warranty.serviceSystem ? (
                          <>
                            <div className="font-medium">Inspect system history</div>
                            <Button asChild variant="ghost" size="sm" className="mt-2 h-auto px-0">
                              <Link
                                to="/support/service-systems/$serviceSystemId"
                                params={{ serviceSystemId: warranty.serviceSystem.id }}
                              >
                                Open system detail
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="font-medium">Finish service linkage</div>
                            <div className="text-muted-foreground mt-2 text-sm">
                              Use the linkage review queue or your external migration process to attach this warranty to a service system.
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {warranty.systemHistoryPreview.length > 0 ? (
                      <div className="grid gap-3">
                        <div className="rounded-md border p-3">
                          <div className="text-muted-foreground mb-2 text-xs uppercase">
                            System History Preview
                          </div>
                          {warranty.systemHistoryPreview.length > 0 ? (
                            <div className="space-y-2">
                              {warranty.systemHistoryPreview.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="flex items-start justify-between gap-3 text-sm"
                                >
                                  <div>{entry.description ?? entry.action.replaceAll('_', ' ')}</div>
                                  <div className="text-muted-foreground whitespace-nowrap">
                                    {formatDate(entry.createdAt)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-sm">
                              System history will appear here once service-system events are logged.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Warranty Details Section */}
                  <DetailSection id="warranty-details" title="Warranty Details" className="lg:col-span-2">
                    <DetailGrid
                      fields={[
                        {
                          label: 'Purchased Via',
                          value: (
                            <div className="flex items-center gap-2">
                              <User className="text-muted-foreground h-4 w-4" />
                              <Link
                                to="/customers/$customerId"
                                params={{ customerId: warranty.customerId }}
                                search={{}}
                                className="text-primary hover:underline"
                              >
                                {warranty.customerName ?? 'Unknown Customer'}
                              </Link>
                            </div>
                          ),
                        },
                        {
                          label: 'Owner of Record',
                          value: warranty.ownerRecord ? (
                            <div className="space-y-1">
                              <div>{warranty.ownerRecord.fullName}</div>
                              <div className="text-muted-foreground text-sm">
                                {[warranty.ownerRecord.email, warranty.ownerRecord.phone]
                                  .filter(Boolean)
                                  .join(' · ') || 'Contact details not recorded'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not captured yet</span>
                          ),
                        },
                        {
                          label: 'Product',
                          value: (
                            <div className="flex items-center gap-2">
                              <Package className="text-muted-foreground h-4 w-4" />
                              <Link
                                to="/products/$productId"
                                params={{ productId: warranty.productId }}
                                className="text-primary hover:underline"
                              >
                                {warranty.productName ?? 'Unknown Product'}
                              </Link>
                            </div>
                          ),
                        },
                        {
                          label: 'Serial Number',
                          value: warranty.productSerial ? (
                            <Link
                              to="/inventory/browser"
                              search={{ view: 'serialized', serializedSearch: warranty.productSerial, page: 1 }}
                              className="font-mono text-primary hover:underline"
                            >
                              {warranty.productSerial}
                            </Link>
                          ) : (
                            <span className="font-mono">N/A</span>
                          ),
                        },
                        {
                          label: 'Policy',
                          value: warranty.policyName,
                        },
                        {
                          label: 'Source Entitlement',
                          value: warranty.sourceEntitlement ? (
                            <div className="space-y-1">
                              <div>
                                {warranty.sourceEntitlement.orderNumber ?? 'Unknown order'} ·{' '}
                                {warranty.sourceEntitlement.shipmentNumber ?? 'Unknown shipment'}
                              </div>
                              <div className="text-muted-foreground text-sm">
                                Delivered {formatDate(warranty.sourceEntitlement.deliveredAt)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Legacy/manual warranty</span>
                          ),
                        },
                        {
                          label: 'Registration Date',
                          value: (
                            <div className="flex items-center gap-2">
                              <Calendar className="text-muted-foreground h-4 w-4" />
                              <span>{formatDate(warranty.registrationDate)}</span>
                            </div>
                          ),
                        },
                        {
                          label: 'Expiry Date',
                          value: (
                            <div className="flex items-center gap-2">
                              <Calendar className="text-muted-foreground h-4 w-4" />
                              <span>{formatDate(warranty.expiryDate)}</span>
                              {getExpiryBadge(daysUntilExpiry)}
                            </div>
                          ),
                        },
                        ...(warranty.policyType === 'battery_performance'
                          ? [
                              {
                                label: 'Current Cycles',
                                value: warranty.currentCycleCount ?? 'Not tracked',
                              },
                              {
                                label: 'Cycle Limit',
                                value: warranty.cycleLimit ?? 'No limit',
                              },
                            ]
                          : []),
                        ...(warranty.notes
                          ? [
                              {
                                label: 'Notes',
                                value: <p className="text-sm">{warranty.notes}</p>,
                                colSpan: 2 as const,
                              },
                            ]
                          : []),
                      ]}
                    />

                    <div className="mt-6 space-y-2">
                      <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                        Support Actions
                      </Label>
                      <div className="flex flex-col gap-2">
                        <Link
                          to="/support/issues/new"
                          search={{
                            customerId: warranty.customerId,
                            warrantyId: warranty.id,
                            warrantyEntitlementId: warranty.sourceEntitlement?.id ?? undefined,
                            productId: warranty.productId,
                            orderId: warranty.sourceEntitlement?.orderId ?? undefined,
                            shipmentId: warranty.sourceEntitlement?.shipmentId ?? undefined,
                            serialNumber: warranty.productSerial ?? undefined,
                          }}
                          className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'justify-start gap-2'
                          )}
                        >
                          <TicketIcon className="h-4 w-4" />
                          Create Support Issue
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Log a new support issue for this warranty
                        </p>
                      </div>
                    </div>
                  </DetailSection>

                  {/* Covered Items Section */}
                  <DetailSection id="covered-items" title="Covered Items">
                    {warranty.items.length === 0 ? (
                      <div className="text-muted-foreground text-sm">No items recorded.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Serial</TableHead>
                            <TableHead>Start</TableHead>
                            <TableHead>End</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {warranty.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.productName ?? 'Unknown'}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {item.productSku ?? '—'}
                              </TableCell>
                              <TableCell className="font-mono">
                                {item.productSerial ? (
                                  <Link
                                    to="/inventory/browser"
                                    search={{ view: 'serialized', serializedSearch: item.productSerial, page: 1 }}
                                    className="text-primary hover:underline"
                                  >
                                    {item.productSerial}
                                  </Link>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                              <TableCell>{formatDate(item.warrantyStartDate)}</TableCell>
                              <TableCell>{formatDate(item.warrantyEndDate)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </DetailSection>
                </div>

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
            </TabsContent>
          )}

          {activeTab === 'claims' && (
            <TabsContent value="claims" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileWarning className="h-5 w-5" />
                        Claims History
                      </CardTitle>
                      <CardDescription>
                        {isClaimsError
                          ? 'Claim history is temporarily unavailable for this warranty.'
                          : `${claims.length} claim${claims.length !== 1 ? 's' : ''} filed for this warranty`}
                      </CardDescription>
                    </div>
                    {canFileClaim && (
                      <Button variant="outline" size="sm" onClick={() => onClaimDialogOpenChange(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Claim
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isClaimsLoading ? (
                    <ClaimsTableSkeleton />
                  ) : isClaimsError ? (
                    <Alert variant="destructive">
                      <AlertDescription className="flex items-center justify-between gap-4">
                        <span>
                          Warranty claims are temporarily unavailable. Please refresh and try again.
                        </span>
                        {onRetryClaims ? (
                          <Button variant="outline" size="sm" onClick={onRetryClaims}>
                            Retry
                          </Button>
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  ) : claims.length === 0 ? (
                    <div className="py-8 text-center">
                      <FileWarning className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                      <h3 className="text-lg font-semibold">No claims filed</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        If you&apos;re experiencing issues with this product, you can file a warranty
                        claim.
                      </p>
                      {canFileClaim && (
                        <Button variant="outline" onClick={() => onClaimDialogOpenChange(true)}>
                          <FileWarning className="mr-2 h-4 w-4" />
                          File a Claim
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Claim #</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden md:table-cell">Cost</TableHead>
                          <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {claims.map((claim) => {
                          const claimTypeCfg = isWarrantyClaimTypeValue(claim.claimType)
                            ? claimTypeConfig[claim.claimType]
                            : undefined;
                          const isPendingReview =
                            pendingClaimAction?.claimId === claim.id &&
                            pendingClaimAction.action === 'review';
                          const isPendingOpen =
                            pendingClaimAction?.claimId === claim.id &&
                            pendingClaimAction.action === 'open';
                          const isPendingResolve =
                            pendingClaimAction?.claimId === claim.id &&
                            pendingClaimAction.action === 'resolve';

                          return (
                            <TableRow
                              key={claim.id}
                              className="hover:bg-muted/50 cursor-pointer"
                              onClick={() => onClaimRowClick(claim.id)}
                            >
                              <TableCell className="font-mono text-sm">{claim.claimNumber}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {claimTypeCfg?.label ?? claim.claimType}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  status={claim.status}
                                  statusConfig={claimStatusConfig}
                                />
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {formatClaimCost(claim.cost)}
                              </TableCell>
                              <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                                {formatClaimDate(claim.submittedAt)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {(claim.status === 'submitted' ||
                                    claim.status === 'under_review') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onReviewClaim(claim);
                                      }}
                                      disabled={isPendingReview}
                                      aria-label={`Review claim ${claim.claimNumber}`}
                                    >
                                      {isPendingReview ? 'Opening...' : 'Review'}
                                    </Button>
                                  )}
                                  {claim.status === 'approved' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        (onResolveClaimRow ?? onClaimRowClick)(claim.id);
                                      }}
                                      disabled={isPendingResolve}
                                      aria-label={`Resolve claim ${claim.claimNumber}`}
                                    >
                                      {isPendingResolve ? 'Opening...' : 'Resolve'}
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onClaimRowClick(claim.id);
                                    }}
                                    disabled={isPendingOpen}
                                    aria-label={`View claim ${claim.claimNumber}`}
                                  >
                                    {isPendingOpen ? (
                                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                                    ) : (
                                      <ExternalLink className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {activeTab === 'warranty-activity' && (
            <TabsContent value="warranty-activity" className="mt-4">
              <div className="space-y-4">
                {/* Action buttons */}
                {(onLogActivity || onScheduleFollowUp) && (
                  <div className="flex items-center justify-end gap-2">
                    {onScheduleFollowUp && (
                      <Button variant="outline" size="sm" onClick={onScheduleFollowUp}>
                        <Clock className="h-4 w-4 mr-2" />
                        Schedule Follow-up
                      </Button>
                    )}
                    {onLogActivity && (
                      <Button size="sm" onClick={onLogActivity}>
                        <Plus className="h-4 w-4 mr-2" />
                        Log Activity
                      </Button>
                    )}
                  </div>
                )}

                <UnifiedActivityTimeline
                  activities={activities}
                  isLoading={activitiesLoading}
                  hasError={!!activitiesError}
                  error={activitiesError || undefined}
                  title="Warranty Activity"
                  description="Warranty-specific actions, notes, claims, and operator activity."
                  showFilters={true}
                  viewAllSearch={getActivitiesFeedSearch('warranty')}
                  emptyMessage="No activity recorded yet"
                  emptyDescription="Warranty activities will appear here when interactions occur."
                />
              </div>
            </TabsContent>
          )}

          {activeTab === 'system-history' && (
            <TabsContent value="system-history" className="mt-4">
              {warranty.serviceSystem ? (
                <UnifiedActivityTimeline
                  activities={systemActivities}
                  isLoading={systemActivitiesLoading}
                  hasError={!!systemActivitiesError}
                  error={systemActivitiesError || undefined}
                  title="System History"
                  description="Canonical service-system events such as linkage, ownership transfer, and backfill outcomes."
                  showFilters={true}
                  viewAllSearch={getActivitiesFeedSearch('service_system')}
                  emptyMessage="No system history recorded yet"
                  emptyDescription="System events will appear here as the installed-system record changes."
                />
              ) : (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    No service system is linked yet, so there is no canonical system history to show.
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>

      <aside className="hidden lg:block sticky top-20 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto">
        {sidebarContent}
      </aside>

      <WarrantyClaimFormDialog
        open={isClaimDialogOpen}
        onOpenChange={onClaimDialogOpenChange}
        warranty={{
          id: warranty.id,
          warrantyNumber: warranty.warrantyNumber,
          productName: warranty.productName ?? undefined,
          commercialCustomerId: warranty.customerId,
          commercialCustomerName: warranty.customerName ?? undefined,
          ownerRecord: warranty.ownerRecord
            ? {
                fullName: warranty.ownerRecord.fullName,
                email: warranty.ownerRecord.email,
                phone: warranty.ownerRecord.phone,
              }
            : null,
          status: warranty.status,
          policyType: warranty.policyType ?? undefined,
          currentCycleCount: warranty.currentCycleCount ?? undefined,
          cycleLimit: warranty.cycleLimit ?? undefined,
        }}
        onSubmit={onSubmitClaim}
        isSubmitting={isSubmittingClaim}
        onSuccess={onClaimsSuccess}
      />

      {approvalClaim && (
        <ClaimApprovalDialog
          open={isApprovalDialogOpen}
          onOpenChange={onApprovalDialogOpenChange}
          claim={{
            id: approvalClaim.id,
            claimNumber: approvalClaim.claimNumber,
            claimType: approvalClaim.claimType,
            status: approvalClaim.status,
            description: approvalClaim.description,
            cost: approvalClaim.cost,
            submittedAt: approvalClaim.submittedAt,
            cycleCountAtClaim: approvalClaim.cycleCountAtClaim,
            warranty: {
              warrantyNumber: warranty.warrantyNumber,
              productSerial: warranty.productSerial,
            },
            customer: {
              name: approvalClaim.customer.name ?? 'Unknown Customer',
            },
            product: {
              name: approvalClaim.product?.name ?? 'Unknown Product',
            },
          }}
          onApprove={onApproveClaim}
          onDeny={onDenyClaim}
          onRequestInfo={onRequestInfoClaim}
          isSubmitting={isSubmittingApproval}
          onSuccess={onClaimsSuccess}
        />
      )}

      <ExtendWarrantyDialog
        open={isExtendDialogOpen}
        onOpenChange={onExtendDialogOpenChange}
        warranty={{
          id: warranty.id,
          warrantyNumber: warranty.warrantyNumber,
          productName: warranty.productName ?? undefined,
          customerName: warranty.customerName ?? undefined,
          expiryDate: warranty.expiryDate,
          status: warranty.status,
        }}
        onSubmit={onExtendWarranty}
        isSubmitting={isSubmittingExtend}
        onSuccess={onExtensionsSuccess}
      />
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ClaimsTableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-6 w-[100px]" />
          <Skeleton className="h-6 w-[120px]" />
          <Skeleton className="h-6 w-[80px]" />
          <Skeleton className="hidden h-6 w-[80px] md:block" />
          <Skeleton className="hidden h-6 w-[80px] sm:block" />
        </div>
      ))}
    </div>
  );
}
