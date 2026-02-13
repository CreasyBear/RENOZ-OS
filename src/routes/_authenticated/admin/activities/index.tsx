/**
 * Activity Analytics Dashboard Route
 *
 * Route definition for admin-level activity analytics with charts, heatmap, and leaderboard.
 * Restricted to owner and admin roles only.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/admin/activities/activity-analytics-page.tsx - Page component
 * @see ACTIVITY-DASHBOARD-UI acceptance criteria
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { requireAdmin } from "@/lib/auth/route-guards";
import { AdminTableSkeleton } from "@/components/skeletons/admin";

const ActivityAnalyticsPage = lazy(() => import('./activity-analytics-page'));

export const Route = createFileRoute("/_authenticated/admin/activities/")({
  beforeLoad: requireAdmin,
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Activity Analytics"
          description="Track and analyze organization activity"
        />
        <PageLayout.Content>
          <AdminTableSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <ActivityAnalyticsPage />
    </Suspense>
  ),
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
