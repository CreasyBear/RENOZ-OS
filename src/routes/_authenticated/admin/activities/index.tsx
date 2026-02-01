/**
 * Activity Analytics Dashboard Route
 *
 * Admin-level activity analytics with charts, heatmap, and leaderboard.
 * Restricted to owner and admin roles only.
 *
 * @see ACTIVITY-DASHBOARD-UI acceptance criteria
 */
import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { ActivityDashboard } from "@/components/shared/activity";
import { requireAdmin } from "@/lib/auth/route-guards";
import { AdminTableSkeleton } from "@/components/skeletons/admin";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/admin/activities/")({
  beforeLoad: requireAdmin,
  component: ActivityAnalyticsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Activity Analytics"
        description="Track and analyze organization activity"
      />
      <PageLayout.Content>
        <AdminTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ActivityAnalyticsPage() {
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
