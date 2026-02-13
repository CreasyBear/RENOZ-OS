/**
 * Audit Log Route
 *
 * Route definition for audit trail viewer with lazy-loaded page component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/admin/audit/audit-page.tsx - Page component
 * @see src/hooks/_shared/use-audit-logs.ts for data fetching hooks
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { requireAdmin } from '@/lib/auth/route-guards';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';

// Lazy load the heavy audit log component
const AuditLogPageContainer = lazy(() => import('./audit-page-container'));

export const Route = createFileRoute('/_authenticated/admin/audit/')({
  beforeLoad: requireAdmin,
  component: () => (
    <PageLayout variant="full-width">
      <Suspense fallback={<AdminTableSkeleton />}>
        <AuditLogPageContainer />
      </Suspense>
    </PageLayout>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <AdminTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
