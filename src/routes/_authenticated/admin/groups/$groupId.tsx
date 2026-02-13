/**
 * Group Detail Route
 *
 * Route definition with lazy-loaded page component and admin guard.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/admin/groups/group-detail-page.tsx - Page component
 */
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/route-guards';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminDetailSkeleton } from '@/components/skeletons/admin';

const GroupDetailPageContainer = lazy(() => import('./group-detail-page-container'));

// Search params
const groupDetailSchema = z.object({
  tab: z.enum(['members', 'settings', 'activity']).default('members'),
});

export const Route = createFileRoute('/_authenticated/admin/groups/$groupId')({
  beforeLoad: requireAdmin,
  validateSearch: groupDetailSchema,
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <AdminDetailSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <GroupDetailPageContainer />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin/groups" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <AdminDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
