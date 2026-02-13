/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Dashboard Route
 *
 * Route definition for tabbed dashboard with lazy-loaded component.
 *
 * Three tabs:
 * - Overview: Square UI inspired dashboard with stats, chart, and tables
 * - Business Overview: Comprehensive business metrics dashboard
 * - Activity: Organization-wide activity feed
 *
 * Tab selection is persisted in URL via search params (?tab=overview|business|activity).
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/dashboard/dashboard-page.tsx - Page component
 * @see docs/design-system/DASHBOARD-STANDARDS.md
 */

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { lazy, Suspense } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { OverviewSkeleton } from '@/components/skeletons/dashboard';

const DashboardPage = lazy(() => import('./dashboard-page'));

// ============================================================================
// SEARCH SCHEMA
// ============================================================================

export const dashboardSearchSchema = z.object({
  tab: z.enum(['overview', 'business', 'activity']).catch('overview'),
});

export type SearchParams = z.infer<typeof dashboardSearchSchema>;

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/dashboard/')({
  validateSearch: (search: Record<string, unknown>): SearchParams =>
    dashboardSearchSchema.parse(search),
  component: function DashboardRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Content>
            <OverviewSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }>
        <DashboardPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <OverviewSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
