/**
 * Activity Analytics Page Component
 *
 * Admin-level activity analytics with charts, heatmap, and leaderboard.
 * Restricted to owner and admin roles only.
 *
 * @source src/components/shared/activity/activity-dashboard.tsx - ActivityDashboard component
 * @see src/routes/_authenticated/admin/activities/index.tsx - Route definition
 * @see ACTIVITY-DASHBOARD-UI acceptance criteria
 */
import { PageLayout } from '@/components/layout';
import { ActivityDashboard } from '@/components/shared/activity';

export default function ActivityAnalyticsPage() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Activity Analytics"
        description="Track and analyze organization activity"
      />
      <PageLayout.Content>
        <ActivityDashboard />
      </PageLayout.Content>
    </PageLayout>
  );
}
