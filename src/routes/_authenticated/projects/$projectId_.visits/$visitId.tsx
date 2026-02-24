/**
 * Site Visit Detail Route
 *
 * Route definition for site visit execution view.
 * Page logic in site-visit-detail-page.tsx (code-split).
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/projects/$projectId_.visits/site-visit-detail-page.tsx
 * @see STANDARDS.md §8 Route Code Splitting
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SiteVisitDetailSkeleton } from '@/components/skeletons/projects';

const SiteVisitDetailPage = lazy(() => import('./site-visit-detail-page'));

export const Route = createFileRoute(
  '/_authenticated/projects/$projectId_/visits/$visitId'
)({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="Site Visit" />
        <PageLayout.Content>
          <SiteVisitDetailSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <SiteVisitDetailPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/projects" />
  ),
});
