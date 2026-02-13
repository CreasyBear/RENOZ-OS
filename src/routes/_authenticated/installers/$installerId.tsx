/**
 * Installer Detail Route
 *
 * Route definition for installer detail with lazy-loaded page component.
 *
 * @see src/routes/_authenticated/installers/installer-detail-page.tsx
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';

const InstallerDetailPage = lazy(() => import('./installer-detail-page'));

const installerDetailSearchSchema = z.object({
  tab: z.enum(['profile', 'schedule', 'performance', 'workload']).default('profile'),
});

const LoadingState = () => (
  <PageLayout variant="full-width">
    <PageLayout.Header title="Installer" description="Loading..." />
    <PageLayout.Content>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </PageLayout.Content>
  </PageLayout>
);

export const Route = createFileRoute('/_authenticated/installers/$installerId')({
  validateSearch: installerDetailSearchSchema,
  component: function InstallerDetailRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense fallback={<LoadingState />}>
        <InstallerDetailPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/installers" />
  ),
  pendingComponent: () => <LoadingState />,
});
