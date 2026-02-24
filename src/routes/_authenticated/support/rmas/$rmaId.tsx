/**
 * RMA Detail Page
 *
 * Route file for RMA detail view. Delegates to RmaDetailContainer for data
 * fetching and RmaDetailView for presentation.
 *
 * STANDARDS.md §3: Routes must NOT call useQuery/useMutation directly.
 * All data and mutation logic lives in RmaDetailContainer (via useRmaDetail).
 *
 * @see STANDARDS.md - Route patterns, Container/Presenter
 * @see SCHEMA-TRACE.md - Data flow: Route → Container → View
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */
import { createFileRoute } from '@tanstack/react-router';

import { DetailPageBackButton } from '@/components/layout/detail-page-back-button';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { RmaDetailContainer } from '@/components/domain/support/rma/rma-detail-container';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/support/rmas/$rmaId')({
  component: RmaDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/rmas" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="RMA Details"
        description="View and manage return authorization"
      />
      <PageLayout.Content>
        <SupportDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function RmaDetailPage() {
  const { rmaId } = Route.useParams();

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={null}
        leading={<DetailPageBackButton to="/support/rmas" aria-label="Back to RMAs" />}
        actions={null}
      />
      <PageLayout.Content>
        <RmaDetailContainer rmaId={rmaId} />
      </PageLayout.Content>
    </PageLayout>
  );
}
