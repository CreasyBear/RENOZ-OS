'use client';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WarrantyActivityTabPanels } from '@/components/domain/warranty/views/warranty-activity-tab-panels';
import { WarrantyClaimsHistoryCard } from '@/components/domain/warranty/views/warranty-claims-history-card';
import { WarrantyDetailOverviewTab } from '@/components/domain/warranty/views/warranty-detail-overview-tab';
import type { WarrantyDetail, WarrantyDetailViewProps } from '@/lib/schemas/warranty';

export type WarrantyDetailTabValue = 'overview' | 'claims' | 'warranty-activity' | 'system-history';

interface WarrantyDetailTabsProps {
  activeTab: WarrantyDetailTabValue;
  onActiveTabChange: (tab: WarrantyDetailTabValue) => void;
  warranty: WarrantyDetail;
  daysUntilExpiry: number;
  claims: WarrantyDetailViewProps['claims'];
  extensions: WarrantyDetailViewProps['extensions'];
  isClaimsLoading: boolean;
  isClaimsError: boolean;
  isExtensionsLoading: boolean;
  isExtensionsError: boolean;
  pendingClaimAction?: WarrantyDetailViewProps['pendingClaimAction'];
  onClaimRowClick: WarrantyDetailViewProps['onClaimRowClick'];
  onResolveClaimRow?: WarrantyDetailViewProps['onResolveClaimRow'];
  onReviewClaim: WarrantyDetailViewProps['onReviewClaim'];
  onClaimDialogOpenChange: WarrantyDetailViewProps['onClaimDialogOpenChange'];
  onRetryClaims?: WarrantyDetailViewProps['onRetryClaims'];
  onRetryExtensions: WarrantyDetailViewProps['onRetryExtensions'];
  onExtendDialogOpenChange: WarrantyDetailViewProps['onExtendDialogOpenChange'];
  activities: NonNullable<WarrantyDetailViewProps['activities']>;
  activitiesLoading: NonNullable<WarrantyDetailViewProps['activitiesLoading']>;
  activitiesError: WarrantyDetailViewProps['activitiesError'];
  systemActivities: NonNullable<WarrantyDetailViewProps['systemActivities']>;
  systemActivitiesLoading: NonNullable<WarrantyDetailViewProps['systemActivitiesLoading']>;
  systemActivitiesError: WarrantyDetailViewProps['systemActivitiesError'];
  onLogActivity?: WarrantyDetailViewProps['onLogActivity'];
  onScheduleFollowUp?: WarrantyDetailViewProps['onScheduleFollowUp'];
}

export function WarrantyDetailTabs({
  activeTab,
  onActiveTabChange,
  warranty,
  daysUntilExpiry,
  claims,
  extensions,
  isClaimsLoading,
  isClaimsError,
  isExtensionsLoading,
  isExtensionsError,
  pendingClaimAction,
  onClaimRowClick,
  onResolveClaimRow,
  onReviewClaim,
  onClaimDialogOpenChange,
  onRetryClaims,
  onRetryExtensions,
  onExtendDialogOpenChange,
  activities,
  activitiesLoading,
  activitiesError,
  systemActivities,
  systemActivitiesLoading,
  systemActivitiesError,
  onLogActivity,
  onScheduleFollowUp,
}: WarrantyDetailTabsProps) {
  const canFileClaim = warranty.status === 'active' || warranty.status === 'expiring_soon';

  return (
    <Tabs value={activeTab} onValueChange={(value) => onActiveTabChange(value as WarrantyDetailTabValue)}>
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
  );
}
