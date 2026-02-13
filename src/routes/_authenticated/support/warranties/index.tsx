/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Warranty List Route
 *
 * Route definition for warranty list page with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/support/warranties/warranties-page.tsx - Page component
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json
 */
import { createFileRoute } from '@tanstack/react-router';
import type { FileRoutesByPath } from '@tanstack/react-router';
import { z } from 'zod';
import { lazy, Suspense } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportTableSkeleton } from '@/components/skeletons/support';

const WarrantiesPage = lazy(() => import('./warranties-page'));

export const searchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'expiring_soon', 'expired', 'voided', 'transferred']).optional(),
  policyType: z
    .enum(['battery_performance', 'inverter_manufacturer', 'installation_workmanship'])
    .optional(),
  page: z.coerce.number().min(1).default(1).catch(1),
  pageSize: z.coerce.number().min(10).max(100).default(20).catch(20),
  sortBy: z.enum(['createdAt', 'expiryDate', 'status']).default('expiryDate').catch('expiryDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc').catch('asc'),
});

export type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute(
  '/_authenticated/support/warranties/' as keyof FileRoutesByPath
)({
  validateSearch: searchSchema,
  component: function WarrantiesRouteComponent() {
    const rawSearch = Route.useSearch();
    const search: SearchParams =
      rawSearch && typeof rawSearch === 'object' && 'page' in rawSearch
        ? rawSearch as SearchParams
        : { page: 1, pageSize: 20, sortBy: 'expiryDate', sortOrder: 'asc' };
    return (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header
            title="Warranties"
            description="View and manage warranty registrations"
          />
          <PageLayout.Content>
            <SupportTableSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }>
        <WarrantiesPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Warranties"
        description="View and manage warranty registrations"
      />
      <PageLayout.Content>
        <SupportTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
