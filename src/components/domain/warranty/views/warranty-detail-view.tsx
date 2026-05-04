'use client';

/**
 * Warranty Detail View
 *
 * Pure UI component for warranty details, claims, and extensions.
 */

import { useState } from 'react';
import { WarrantyDetailAlertsSection } from '@/components/domain/warranty/views/warranty-detail-alerts-section';
import { WarrantyDetailDialogs } from '@/components/domain/warranty/views/warranty-detail-dialogs';
import { WarrantyDetailHeaderSection } from '@/components/domain/warranty/views/warranty-detail-header-section';
import { WarrantyDetailSidebarContent } from '@/components/domain/warranty/views/warranty-detail-sidebar-content';
import {
  WarrantyDetailTabs,
  type WarrantyDetailTabValue,
} from '@/components/domain/warranty/views/warranty-detail-tabs';
import { WarrantyCoverageSummary } from '@/components/domain/warranty/views/warranty-coverage-summary';
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
  const [activeTab, setActiveTab] = useState<WarrantyDetailTabValue>('overview');
  const daysUntilExpiry = getDaysUntilExpiry(warranty.expiryDate);
  const approvalClaim = selectedClaimForApproval ?? null;

  const sidebarContent = (
    <WarrantyDetailSidebarContent
      warranty={warranty}
      certificateStatus={certificateStatus}
      isCertificateLoading={isCertificateLoading}
      certificateError={certificateError}
      isOptOutUpdating={isOptOutUpdating}
      onToggleOptOut={onToggleOptOut}
      onRetryCertificate={onRetryCertificate}
      onOpenTransferOwnership={onOpenTransferOwnership}
      isTransferringOwnership={isTransferringOwnership}
    />
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

        <WarrantyDetailAlertsSection
          warranty={warranty}
          daysUntilExpiry={daysUntilExpiry}
          onExtendDialogOpenChange={onExtendDialogOpenChange}
          onReviewClaims={() => setActiveTab('claims')}
          onToggleOptOut={onToggleOptOut}
        />

        <WarrantyDetailTabs
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          warranty={warranty}
          daysUntilExpiry={daysUntilExpiry}
          claims={claims}
          extensions={extensions}
          isClaimsLoading={isClaimsLoading}
          isClaimsError={isClaimsError}
          isExtensionsLoading={isExtensionsLoading}
          isExtensionsError={isExtensionsError}
          pendingClaimAction={pendingClaimAction}
          onClaimRowClick={onClaimRowClick}
          onResolveClaimRow={onResolveClaimRow}
          onReviewClaim={onReviewClaim}
          onClaimDialogOpenChange={onClaimDialogOpenChange}
          onRetryClaims={onRetryClaims}
          onRetryExtensions={onRetryExtensions}
          onExtendDialogOpenChange={onExtendDialogOpenChange}
          activities={activities}
          activitiesLoading={activitiesLoading}
          activitiesError={activitiesError}
          systemActivities={systemActivities}
          systemActivitiesLoading={systemActivitiesLoading}
          systemActivitiesError={systemActivitiesError}
          onLogActivity={onLogActivity}
          onScheduleFollowUp={onScheduleFollowUp}
        />
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
