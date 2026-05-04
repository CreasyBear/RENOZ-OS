'use client';

/**
 * Warranty Detail View
 *
 * Pure UI component for warranty details, claims, and extensions.
 */

import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Clock,
  Plus,
  TicketIcon,
  PanelRight,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, EntityHeader, MetricCard } from '@/components/shared';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { getActivitiesFeedSearch } from '@/lib/activities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { WarrantyClaimFormDialog } from '@/components/domain/warranty/dialogs/warranty-claim-form-dialog';
import { ClaimApprovalDialog } from '@/components/domain/warranty/dialogs/claim-approval-dialog';
import { ExtendWarrantyDialog } from '@/components/domain/warranty/dialogs/extend-warranty-dialog';
import { WarrantyExtensionHistory } from '@/components/domain/warranty/views/warranty-extension-history';
import { WarrantyAlerts } from '@/components/domain/warranty/views/warranty-alerts';
import { buildWarrantyAlerts } from '@/components/domain/warranty/views/warranty-alerts-utils';
import { WarrantyCertificateStatusCard } from '@/components/domain/warranty/views/warranty-certificate-status-card';
import { WarrantyClaimsHistoryCard } from '@/components/domain/warranty/views/warranty-claims-history-card';
import { WarrantyLineageSections } from '@/components/domain/warranty/views/warranty-lineage-sections';
import { WarrantyNotificationSettingsCard } from '@/components/domain/warranty/views/warranty-notification-settings-card';
import {
  WarrantyServiceMissionControl,
  WarrantyServiceSystemCard,
} from '@/components/domain/warranty/views/warranty-service-linkage';
import { getServiceLinkagePresentation } from '@/components/domain/warranty/views/warranty-service-linkage-utils';
import { useAlertDismissals } from '@/hooks/_shared/use-alert-dismissals';
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
    return buildWarrantyAlerts({
      warrantyId: warranty.id,
      warrantyStatus: warranty.status,
      daysUntilExpiry,
      expiryAlertOptOut: warranty.expiryAlertOptOut,
    });
  }, [daysUntilExpiry, warranty.expiryAlertOptOut, warranty.id, warranty.status]);

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

        <WarrantyAlerts
          alerts={visibleAlerts}
          onDismiss={dismiss}
          onExtendWarranty={() => onExtendDialogOpenChange(true)}
          onReviewClaims={() => setActiveTab('claims')}
          onEnableAlerts={() => onToggleOptOut(false)}
        />

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

                <WarrantyLineageSections
                  warranty={warranty}
                  daysUntilExpiry={daysUntilExpiry}
                />

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
