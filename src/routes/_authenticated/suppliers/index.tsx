/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Suppliers Index Route
 *
 * Route definition for supplier directory page with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/suppliers/suppliers-page.tsx - Page component
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';

export const supplierSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).optional().default(20),
  search: z.string().optional().default(''),
  status: z.string().optional(),
  supplierType: z.string().optional(),
  ratingMin: z.coerce.number().optional(),
  ratingMax: z.coerce.number().optional(),
  sortBy: z.enum(['name', 'status', 'overallRating', 'createdAt', 'lastOrderDate']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// Lazy load the heavy suppliers page component
const SuppliersPage = lazy(() => import('./suppliers-page'));

export const Route = createFileRoute('/_authenticated/suppliers/')({
  validateSearch: supplierSearchSchema,
  component: function SuppliersRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header title="Suppliers" />
          <PageLayout.Content>
            <AdminTableSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }>
        <SuppliersPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/suppliers" />
  ),
  pendingComponent: () => <AdminTableSkeleton />,
});
