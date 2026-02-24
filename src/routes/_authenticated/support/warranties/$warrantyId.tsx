/**
 * Warranty Detail Route
 *
 * Layout-only route that renders the warranty detail container.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback, DetailPageBackButton } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { WarrantyDetailContainer } from '@/components/domain/warranty/containers/warranty-detail-container';

export const Route = createFileRoute('/_authenticated/support/warranties/$warrantyId')({
  component: WarrantyDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/warranties" />
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

function WarrantyDetailPage() {
  const { warrantyId } = Route.useParams();

  return (
    <WarrantyDetailContainer warrantyId={warrantyId}>
      {({ headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header
            title={null}
            leading={<DetailPageBackButton to="/support/warranties" aria-label="Back to warranties" />}
            actions={headerActions}
          />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </WarrantyDetailContainer>
  );
}
