/**
 * Warranty Detail Route
 *
 * Layout-only route that renders the warranty detail container.
 */
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { WarrantyDetailContainer } from '@/components/domain/warranty';

export const Route = createFileRoute('/_authenticated/support/warranties/$warrantyId')({
  component: WarrantyDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/warranties" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Warranty Details" description="Loading warranty information..." />
      <PageLayout.Content>
        <SupportDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function WarrantyDetailPage() {
  const { warrantyId } = Route.useParams();
  return (
    <WarrantyDetailContainer warrantyId={warrantyId}>
      {({ headerTitle, headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header title={headerTitle} actions={headerActions} />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </WarrantyDetailContainer>
  );
}
