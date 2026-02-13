/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Customers Index Route
 *
 * Route definition for customer directory page with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/customers/customers-page.tsx - Page component
 */
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { CustomerTableSkeleton } from '@/components/skeletons/customers';

// Search params schema for URL-based filtering
export const searchParamsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['prospect', 'active', 'inactive', 'suspended', 'blacklisted']).optional(),
  type: z.enum(['individual', 'business', 'government', 'non_profit']).optional(),
  size: z.enum(['micro', 'small', 'medium', 'large', 'enterprise']).optional(),
  healthScoreMin: z.coerce.number().int().min(0).max(100).optional(),
  healthScoreMax: z.coerce.number().int().min(0).max(100).optional(),
  tag: z.string().uuid().optional(), // Single tag ID for filtering
  sortBy: z.string().optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

// Lazy load the heavy customers page component
const CustomersPage = lazy(() => import('./customers-page'));

export const Route = createFileRoute('/_authenticated/customers/')({
  validateSearch: searchParamsSchema,
  component: function CustomersRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header title="Customers" />
          <PageLayout.Content>
            <CustomerTableSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }>
        <CustomersPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Customers" />
      <PageLayout.Content>
        <CustomerTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
