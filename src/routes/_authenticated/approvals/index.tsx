/**
 * Approvals Index Route
 *
 * Route definition for approval dashboard with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/approvals/approvals-page.tsx - Page component
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-APPROVAL-WORKFLOW)
 */
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import { approvalsSearchSchema } from '@/lib/schemas/approvals';

const ApprovalsPage = lazy(() => import('./approvals-page'));

export const Route = createFileRoute('/_authenticated/approvals/')({
  validateSearch: approvalsSearchSchema,
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="Approvals" />
        <PageLayout.Content>
          <AdminTableSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <ApprovalsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => <AdminTableSkeleton />,
});
