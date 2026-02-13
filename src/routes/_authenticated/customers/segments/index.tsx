/**
 * Customer Segments Index Route
 *
 * Route definition for customer segments management with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/customers/segments/segments-page.tsx - Page component
 */
import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { InventoryTabsSkeleton } from '@/components/skeletons/inventory'

const SegmentsPage = lazy(() => import('./segments-page'))

export const Route = createFileRoute('/_authenticated/customers/segments/')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as 'list' | 'analytics') || 'list',
  }),
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Customer Segments"
          description="Create and manage customer segments for targeted actions"
        />
        <PageLayout.Content>
          <InventoryTabsSkeleton tabCount={2} />
        </PageLayout.Content>
      </PageLayout>
    }>
      <SegmentsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/customers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Customer Segments"
        description="Create and manage customer segments for targeted actions"
      />
      <PageLayout.Content>
        <InventoryTabsSkeleton tabCount={2} />
      </PageLayout.Content>
    </PageLayout>
  ),
})
