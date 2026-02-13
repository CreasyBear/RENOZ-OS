/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * RMA List Index Route
 *
 * Route definition for RMA list with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/support/rmas/rmas-page.tsx - Page component
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 */
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportTableSkeleton } from '@/components/skeletons/support';

export const rmasSearchSchema = z.object({
  status: z
    .enum(['requested', 'approved', 'received', 'processed', 'rejected'])
    .optional(),
  reason: z
    .enum([
      'defective',
      'damaged_in_shipping',
      'wrong_item',
      'not_as_described',
      'performance_issue',
      'installation_failure',
      'other',
    ])
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  sortBy: z.enum(['createdAt', 'rmaNumber', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const RmasPage = lazy(() => import('./rmas-page'));

export const Route = createFileRoute('/_authenticated/support/rmas/')({
  validateSearch: rmasSearchSchema,
  component: function RmasRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header
            title="Return Authorizations"
            description="Manage product returns and RMA workflow"
          />
          <PageLayout.Content>
            <SupportTableSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }>
        <RmasPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Return Authorizations"
        description="Manage product returns and RMA workflow"
      />
      <PageLayout.Content>
        <SupportTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
