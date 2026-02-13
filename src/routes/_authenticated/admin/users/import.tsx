/**
 * Bulk User Import Route
 *
 * Route definition with lazy-loaded page component and admin guard.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/admin/users/import-page.tsx - Page component
 */
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { requireAdmin } from '@/lib/auth/route-guards';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminFormSkeleton } from '@/components/skeletons/admin';

const ImportPageContainer = lazy(() => import('./import-page-container'));

export const Route = createFileRoute('/_authenticated/admin/users/import')({
  beforeLoad: requireAdmin,
  component: () => (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Content>
            <AdminFormSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }>
        <ImportPageContainer />
      </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin/users" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <AdminFormSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
