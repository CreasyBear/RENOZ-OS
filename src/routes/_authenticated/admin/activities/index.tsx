/**
 * Activity Analytics Dashboard Route
 *
 * Admin-level activity analytics with charts, heatmap, and leaderboard.
 * Restricted to owner and admin roles only.
 *
 * @see ACTIVITY-DASHBOARD-UI acceptance criteria
 */
import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/layout";
import { ActivityDashboard } from "@/components/activity";
import { requireAdmin } from "@/lib/auth/route-guards";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/admin/activities/")({
  beforeLoad: requireAdmin,
  component: ActivityAnalyticsPage,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ActivityAnalyticsPage() {
  return (
    <PageLayout variant="container">
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
