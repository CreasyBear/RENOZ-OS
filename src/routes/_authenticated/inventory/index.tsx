/**
 * Inventory Index Route
 *
 * Route definition for inventory dashboard with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/inventory/inventory-page.tsx - Page component
 * @see docs/design-system/INVENTORY-DASHBOARD-SPEC.md for specification
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';

const InventoryPage = lazy(() => import('./inventory-page'));

export const Route = createFileRoute('/_authenticated/inventory/')({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="container">
        <PageLayout.Header
          title="Inventory"
          actions={
            <div className="text-right">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-16 mt-1" />
            </div>
          }
        />
        <PageLayout.Content>
          <InventoryDashboardSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <InventoryPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="container">
      <PageLayout.Header
        title="Inventory"
        actions={
          <div className="text-right">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-16 mt-1" />
          </div>
        }
      />
      <PageLayout.Content>
        <InventoryDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// Skeleton component for loading state
function InventoryDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search + Actions */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      {/* Stock Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>

      {/* Activity Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
