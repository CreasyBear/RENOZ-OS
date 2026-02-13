/**
 * Customer Duplicates Route
 *
 * Manage duplicate customer detection and merge operations.
 * Uses container/presenter pattern per STANDARDS.md.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see src/components/domain/customers/containers/duplicates-container.tsx
 */
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { InventoryTabsSkeleton } from '@/components/skeletons/inventory';
import { DuplicatesContainer } from '@/components/domain/customers/containers';

export const Route = createFileRoute('/_authenticated/customers/duplicates')({
  component: CustomerDuplicatesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as 'detection' | 'history') || 'detection',
  }),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/customers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Duplicate Management"
        description="Detect and merge duplicate customer records"
      />
      <PageLayout.Content>
        <InventoryTabsSkeleton tabCount={2} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function CustomerDuplicatesPage() {
  const search = useSearch({ from: '/_authenticated/customers/duplicates' });

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Duplicate Management"
        description="Detect and merge duplicate customer records"
      />
      <PageLayout.Content>
        <DuplicatesContainer initialTab={search.tab} />
      </PageLayout.Content>
    </PageLayout>
  );
}
