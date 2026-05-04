'use client';

/**
 * Warranty Detail View
 *
 * Pure UI component for warranty details, claims, and extensions.
 */

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WarrantyActivityTabPanels } from '@/components/domain/warranty/views/warranty-activity-tab-panels';
import { WarrantyDetailDialogs } from '@/components/domain/warranty/views/warranty-detail-dialogs';
import { WarrantyDetailHeaderSection } from '@/components/domain/warranty/views/warranty-detail-header-section';
import { WarrantyDetailOverviewTab } from '@/components/domain/warranty/views/warranty-detail-overview-tab';
import { WarrantyAlerts } from '@/components/domain/warranty/views/warranty-alerts';
import { buildWarrantyAlerts } from '@/components/domain/warranty/views/warranty-alerts-utils';
import { WarrantyCertificateStatusCard } from '@/components/domain/warranty/views/warranty-certificate-status-card';
import { WarrantyClaimsHistoryCard } from '@/components/domain/warranty/views/warranty-claims-history-card';
import { WarrantyCoverageSummary } from '@/components/domain/warranty/views/warranty-coverage-summary';
import { WarrantyNotificationSettingsCard } from '@/components/domain/warranty/views/warranty-notification-settings-card';
import { WarrantySidebarSummaryCards } from '@/components/domain/warranty/views/warranty-sidebar-summary-cards';
import {
  WarrantyServiceSystemCard,
} from '@/components/domain/warranty/views/warranty-service-linkage';
import { useAlertDismissals } from '@/hooks/_shared/use-alert-dismissals';
import { getDaysUntilExpiry } from '@/lib/warranty';

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
  const daysUntilExpiry = getDaysUntilExpiry(warranty.expiryDate);
  const canFileClaim = warranty.status === 'active' || warranty.status === 'expiring_soon';
  const approvalClaim = selectedClaimForApproval ?? null;
  const { dismiss, isAlertDismissed } = useAlertDismissals();

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
      <WarrantySidebarSummaryCards warranty={warranty} />

      <WarrantyServiceSystemCard
        warranty={warranty}
        onOpenTransferOwnership={onOpenTransferOwnership}
        isTransferringOwnership={isTransferringOwnership}
      />

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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <main className="min-w-0 space-y-6">
        <WarrantyDetailHeaderSection
          warranty={warranty}
          sidebarContent={sidebarContent}
          headerActionsInLayout={headerActionsInLayout}
          certificateStatus={certificateStatus}
          isSubmittingClaim={isSubmittingClaim}
          isSubmittingExtend={isSubmittingExtend}
          isCertificateLoading={isCertificateLoading}
          isCertificateRegenerating={isCertificateRegenerating}
          isCertificateGenerating={isCertificateGenerating}
          onClaimDialogOpenChange={onClaimDialogOpenChange}
          onExtendDialogOpenChange={onExtendDialogOpenChange}
          onDownloadCertificate={onDownloadCertificate}
          onRegenerateCertificate={onRegenerateCertificate}
          onGenerateCertificate={onGenerateCertificate}
          onDelete={onDelete}
        />

        <WarrantyCoverageSummary
          warranty={warranty}
          daysUntilExpiry={daysUntilExpiry}
          claimSummary={claimSummary}
          claimSummaryState={claimSummaryState}
          isClaimsLoading={isClaimsLoading}
          isClaimSummaryLoading={isClaimSummaryLoading}
        />

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
              <WarrantyDetailOverviewTab
                warranty={warranty}
                daysUntilExpiry={daysUntilExpiry}
                extensions={extensions}
                isExtensionsLoading={isExtensionsLoading}
                isExtensionsError={isExtensionsError}
                onRetryExtensions={onRetryExtensions}
                onExtendDialogOpenChange={onExtendDialogOpenChange}
              />
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

          <WarrantyActivityTabPanels
            activeTab={activeTab}
            hasServiceSystem={!!warranty.serviceSystem}
            activities={activities}
            activitiesLoading={activitiesLoading}
            activitiesError={activitiesError}
            systemActivities={systemActivities}
            systemActivitiesLoading={systemActivitiesLoading}
            systemActivitiesError={systemActivitiesError}
            onLogActivity={onLogActivity}
            onScheduleFollowUp={onScheduleFollowUp}
          />
        </Tabs>
      </main>

      <aside className="hidden lg:block sticky top-20 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto">
        {sidebarContent}
      </aside>

      <WarrantyDetailDialogs
        warranty={warranty}
        approvalClaim={approvalClaim}
        isClaimDialogOpen={isClaimDialogOpen}
        isApprovalDialogOpen={isApprovalDialogOpen}
        isExtendDialogOpen={isExtendDialogOpen}
        isSubmittingClaim={isSubmittingClaim}
        isSubmittingApproval={isSubmittingApproval}
        isSubmittingExtend={isSubmittingExtend}
        onClaimDialogOpenChange={onClaimDialogOpenChange}
        onApprovalDialogOpenChange={onApprovalDialogOpenChange}
        onExtendDialogOpenChange={onExtendDialogOpenChange}
        onSubmitClaim={onSubmitClaim}
        onApproveClaim={onApproveClaim}
        onDenyClaim={onDenyClaim}
        onRequestInfoClaim={onRequestInfoClaim}
        onExtendWarranty={onExtendWarranty}
        onClaimsSuccess={onClaimsSuccess}
        onExtensionsSuccess={onExtensionsSuccess}
      />
    </div>
  );
}
