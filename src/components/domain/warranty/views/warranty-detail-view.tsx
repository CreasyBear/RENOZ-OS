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
  Plus,
  TicketIcon,
  PanelRight,
  X,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { WarrantyClaimFormDialog } from '@/components/domain/warranty/dialogs/warranty-claim-form-dialog';
import { ClaimApprovalDialog } from '@/components/domain/warranty/dialogs/claim-approval-dialog';
import { ExtendWarrantyDialog } from '@/components/domain/warranty/dialogs/extend-warranty-dialog';
import { WarrantyExtensionHistory } from '@/components/domain/warranty/views/warranty-extension-history';
import { WarrantyClaimsHistoryCard } from '@/components/domain/warranty/views/warranty-claims-history-card';
import { WarrantySupportActions } from '@/components/domain/warranty/views/warranty-support-actions';
import {
  WarrantyServiceMissionControl,
  WarrantyServiceSystemCard,
} from '@/components/domain/warranty/views/warranty-service-linkage';
import { getServiceLinkagePresentation } from '@/components/domain/warranty/views/warranty-service-linkage-utils';
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

      <WarrantyServiceSystemCard
        warranty={warranty}
        onOpenTransferOwnership={onOpenTransferOwnership}
        isTransferringOwnership={isTransferringOwnership}
      />

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

                <WarrantyServiceMissionControl warranty={warranty} />

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

                    <WarrantySupportActions warranty={warranty} />
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
              <WarrantyClaimsHistoryCard
                claims={claims}
                canFileClaim={canFileClaim}
                isClaimsLoading={isClaimsLoading}
                isClaimsError={isClaimsError}
                pendingClaimAction={pendingClaimAction}
                onClaimRowClick={onClaimRowClick}
                onResolveClaimRow={onResolveClaimRow}
                onReviewClaim={onReviewClaim}
                onClaimDialogOpenChange={onClaimDialogOpenChange}
                onRetryClaims={onRetryClaims}
              />
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
