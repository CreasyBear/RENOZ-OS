/**
 * Warranty Claim Detail Route
 *
 * Layout-only route that renders the claim detail container.
 */
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { WarrantyClaimDetailContainer } from '@/components/domain/warranty';

export const Route = createFileRoute('/_authenticated/support/claims/$claimId')({
  component: ClaimDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/claims" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Claim Details" description="Loading warranty claim information..." />
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
      {({ headerTitle, headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header title={headerTitle} actions={headerActions} />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </WarrantyClaimDetailContainer>
  );
}
