/**
 * Issue Detail Page
 *
 * Route file for issue detail view. Delegates to IssueDetailContainer for data
 * fetching and IssueDetailView for presentation.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Route patterns
 */
import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { PageLayout } from '@/components/layout';
import { IssueDetailContainer } from '@/components/domain/support/issues';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/support/issues/$issueId')({
  component: IssueDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/issues" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Issue Details"
        description="Loading issue information..."
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

function IssueDetailPage() {
  const { issueId } = Route.useParams();
  return (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <IssueDetailContainer issueId={issueId} />
      </PageLayout.Content>
    </PageLayout>
  );
}
