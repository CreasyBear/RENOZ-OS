/**
 * Warranty Claim Detail Route
 *
 * Layout-only route that renders the claim detail container.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback, DetailPageBackButton } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { WarrantyClaimDetailContainer } from '@/components/domain/warranty/containers/warranty-claim-detail-container';

export const Route = createFileRoute('/_authenticated/support/claims/$claimId')({
  component: ClaimDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/claims" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title={null} />
      <PageLayout.Content>
        <SupportDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function ClaimDetailPage() {
  const { claimId } = Route.useParams();

  return (
    <WarrantyClaimDetailContainer claimId={claimId}>
      {({ headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header
            title={null}
            leading={<DetailPageBackButton to="/support/claims" aria-label="Back to claims" />}
            actions={headerActions}
          />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </WarrantyClaimDetailContainer>
  );
}
