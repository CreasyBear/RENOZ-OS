/**
 * Support Dashboard Route
 *
 * Route definition for the support dashboard with lazy-loaded page component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/support/support-page.tsx - Page component
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDashboardSkeleton } from '@/components/skeletons/support';

// Lazy load the heavy dashboard component
const SupportDashboardPage = lazy(() => import('./support-page'));

export const Route = createFileRoute('/_authenticated/support/')({
  component: () => (
    <PageLayout variant="full-width">
      <Suspense fallback={<SupportDashboardSkeleton />}>
        <SupportDashboardPage />
      </Suspense>
    </PageLayout>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Support"
        description="Customer support, warranties, and claims management"
      />
      <PageLayout.Content>
        <SupportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
