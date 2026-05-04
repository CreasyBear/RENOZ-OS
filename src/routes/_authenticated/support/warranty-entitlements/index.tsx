/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
import { lazy, Suspense } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportTableSkeleton } from '@/components/skeletons/support';
import { warrantyEntitlementStatusSchema } from '@/lib/schemas/warranty';

const WarrantyEntitlementsPage = lazy(() => import('./warranty-entitlements-page'));

export const searchSchema = z.object({
  search: z.string().optional(),
  status: warrantyEntitlementStatusSchema.optional(),
});

export type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_authenticated/support/warranty-entitlements/')({
  validateSearch: searchSchema,
  component: function WarrantyEntitlementsRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense
        fallback={
          <PageLayout variant="full-width">
            <PageLayout.Header
              title="Warranty Entitlements"
              description="Delivered coverage records waiting to become owned warranties."
            />
            <PageLayout.Content>
              <SupportTableSkeleton />
            </PageLayout.Content>
          </PageLayout>
        }
      >
        <WarrantyEntitlementsPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Warranty Entitlements"
        description="Delivered coverage records waiting to become owned warranties."
      />
      <PageLayout.Content>
        <SupportTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
