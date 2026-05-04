'use client';

import { Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { UnifiedActivityTimeline } from '@/components/shared/activity/unified-activity-timeline';
import { getActivitiesFeedSearch } from '@/lib/activities';
import type { WarrantyDetailViewProps } from '@/lib/schemas/warranty';

type WarrantyActivityTabValue = 'overview' | 'claims' | 'warranty-activity' | 'system-history';

interface WarrantyActivityTabPanelsProps {
  activeTab: WarrantyActivityTabValue | string;
  hasServiceSystem: boolean;
  activities: NonNullable<WarrantyDetailViewProps['activities']>;
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  systemActivities: NonNullable<WarrantyDetailViewProps['systemActivities']>;
  systemActivitiesLoading?: boolean;
  systemActivitiesError?: Error | null;
  onLogActivity?: () => void;
  onScheduleFollowUp?: () => void;
}

export function WarrantyActivityTabPanels({
  activeTab,
  hasServiceSystem,
  activities,
  activitiesLoading = false,
  activitiesError,
  systemActivities,
  systemActivitiesLoading = false,
  systemActivitiesError,
  onLogActivity,
  onScheduleFollowUp,
}: WarrantyActivityTabPanelsProps) {
  return (
    <>
      {activeTab === 'warranty-activity' ? (
        <TabsContent value="warranty-activity" className="mt-4">
          <div className="space-y-4">
            {(onLogActivity || onScheduleFollowUp) ? (
              <div className="flex items-center justify-end gap-2">
                {onScheduleFollowUp ? (
                  <Button variant="outline" size="sm" onClick={onScheduleFollowUp}>
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule Follow-up
                  </Button>
                ) : null}
                {onLogActivity ? (
                  <Button size="sm" onClick={onLogActivity}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Activity
                  </Button>
                ) : null}
              </div>
            ) : null}

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
      ) : null}

      {activeTab === 'system-history' ? (
        <TabsContent value="system-history" className="mt-4">
          {hasServiceSystem ? (
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
      ) : null}
    </>
  );
}
