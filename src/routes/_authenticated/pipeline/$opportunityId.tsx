/**
 * Opportunity Detail Route
 *
 * Thin route layer that delegates to OpportunityDetailContainer.
 * Container handles all data fetching, mutations, and state via composite hook.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback, DetailPageBackButton } from '@/components/layout';
import { PipelineDetailSkeleton } from '@/components/skeletons/pipeline';
import { OpportunityDetailContainer } from '@/components/domain/pipeline/opportunities/containers/opportunity-detail-container';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/pipeline/$opportunityId')({
  component: OpportunityDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/pipeline" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Opportunity" />
      <PageLayout.Content>
        <PipelineDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function OpportunityDetailPage() {
  const { opportunityId } = Route.useParams();

  return (
    <OpportunityDetailContainer opportunityId={opportunityId}>
      {({ headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header
            title={null}
            leading={<DetailPageBackButton to="/pipeline" aria-label="Back to pipeline" />}
            actions={headerActions}
          />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </OpportunityDetailContainer>
  );
}
