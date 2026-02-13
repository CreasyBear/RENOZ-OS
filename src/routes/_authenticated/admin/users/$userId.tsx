/**
 * User Detail Route
 *
 * Route definition with lazy-loaded page component and admin guard.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/admin/users/user-detail-page.tsx - Page component
 */
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/route-guards';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminDetailSkeleton } from '@/components/skeletons/admin';

const UserDetailPage = lazy(() => import('./user-detail-page'));

// Search params
const userDetailSchema = z.object({
  tab: z.enum(['profile', 'groups', 'activity']).default('profile'),
});

export const Route = createFileRoute('/_authenticated/admin/users/$userId')({
  beforeLoad: requireAdmin,
  validateSearch: userDetailSchema,
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <AdminDetailSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <UserDetailPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin/users" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <AdminDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
