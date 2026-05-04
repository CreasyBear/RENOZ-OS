import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { ServiceLinkageReviewDetailContainer } from '@/components/domain/service';

export const Route = createFileRoute('/_authenticated/support/service-linkage-reviews/$reviewId')({
  component: ServiceLinkageReviewDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/service-linkage-reviews" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Service Linkage Review"
        description="Loading review details..."
      />
      <PageLayout.Content>
        <SupportDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function ServiceLinkageReviewDetailPage() {
  const { reviewId } = Route.useParams();
  return (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <ServiceLinkageReviewDetailContainer reviewId={reviewId} />
      </PageLayout.Content>
    </PageLayout>
  );
}
