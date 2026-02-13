/**
 * Projects Index Route
 *
 * Route definition for projects dashboard with lazy-loaded component.
 * URL-synced filters per DOMAIN-LANDING Zone 2.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/projects/projects-page.tsx - Page component
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ProjectsPageSkeleton } from '@/components/skeletons/projects/projects-page-skeleton';
import { projectsSearchSchema } from '@/lib/schemas/jobs/projects';

const ProjectsPage = lazy(() => import('./projects-page'));

export const Route = createFileRoute('/_authenticated/projects/')({
  validateSearch: projectsSearchSchema,
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="Projects" description="Loading projects..." />
        <PageLayout.Content>
          <ProjectsPageSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <ProjectsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Projects" description="Loading projects..." />
      <PageLayout.Content>
        <ProjectsPageSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
