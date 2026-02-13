/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Purchase Orders Index Route
 *
 * Route definition for purchase order list page with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/purchase-orders/purchase-orders-page.tsx - Page component
 */

import { createFileRoute, useRouter } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';

function PurchaseOrdersListError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <RouteErrorFallback
      error={error}
      parentRoute="/purchase-orders"
      onRetry={() => router.invalidate()}
    />
  );
}

export const poSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).optional().default(20),
  search: z.string().optional().default(''),
  status: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minTotal: z.coerce.number().optional(),
  maxTotal: z.coerce.number().optional(),
  overdue: z.string().optional(),
  sortBy: z.enum(['poNumber', 'orderDate', 'requiredDate', 'totalAmount', 'status', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  receive: z.string().uuid().optional(), // PO ID to auto-open receiving dialog
});

// Lazy load the heavy purchase orders page component
const PurchaseOrdersPage = lazy(() => import('./purchase-orders-page'));

export const Route = createFileRoute('/_authenticated/purchase-orders/')({
  validateSearch: poSearchSchema,
  component: function PurchaseOrdersRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header title="Purchase Orders" />
          <PageLayout.Content>
            <AdminTableSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }>
        <PurchaseOrdersPage search={search} />
      </Suspense>
    );
  },
  errorComponent: PurchaseOrdersListError,
  pendingComponent: () => <AdminTableSkeleton />,
});
