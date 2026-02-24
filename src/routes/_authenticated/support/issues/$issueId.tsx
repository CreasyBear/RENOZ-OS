/**
 * Issue Detail Page
 *
 * Route file for issue detail view. Delegates to IssueDetailContainer for data
 * fetching and IssueDetailView for presentation.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Route patterns
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { RouteErrorFallback } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { PageLayout } from '@/components/layout';
import { IssueDetailContainer } from '@/components/domain/support/issues';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/support/issues/$issueId')({
  validateSearch: z.object({
    tab: z.enum(['overview', 'activity', 'related']).optional(),
    escalate: z.enum(['true', 'false']).optional(),
  }),
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
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const handleTabChangeToUrl = (tab: string) => {
    if (tab !== 'overview' && tab !== 'activity' && tab !== 'related') return;
    navigate({
      search: (prev) => ({
        ...prev,
        tab,
      }),
      replace: true,
    });
  };
  const handleEscalationOpenChangeToUrl = (open: boolean) => {
    navigate({
      search: (prev) => ({
        ...prev,
        escalate: open ? 'true' : undefined,
      }),
      replace: true,
    });
  };
  return (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <IssueDetailContainer
          issueId={issueId}
          activeTabFromUrl={search.tab ?? 'overview'}
          onTabChangeToUrl={handleTabChangeToUrl}
          escalationOpenFromUrl={search.escalate === 'true'}
          onEscalationDialogChangeToUrl={handleEscalationOpenChangeToUrl}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
