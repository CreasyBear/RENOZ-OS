/**
 * Purchase Order Edit Route
 *
 * Canonical route-driven edit entry for purchase orders.
 * Reuses the detail container's edit surface, opened deterministically on mount.
 */

import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, DetailPageBackButton, RouteErrorFallback } from '@/components/layout';
import { AdminDetailSkeleton } from '@/components/skeletons/admin';
import { PODetailContainer } from '@/components/domain/purchase-orders';

export const Route = createFileRoute('/_authenticated/purchase-orders/$poId_/edit')({
  component: PurchaseOrderEditPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/purchase-orders" />
  ),
  pendingComponent: () => <AdminDetailSkeleton />,
});

function PurchaseOrderEditPage() {
  const navigate = Route.useNavigate();
  const { poId } = Route.useParams();

  return (
    <PageLayout variant="full-width">
      <PODetailContainer
        poId={poId}
        onBack={() => navigate({ to: '/purchase-orders' })}
        openEditOnMount
        onEditModeClose={() =>
          navigate({ to: '/purchase-orders/$poId', params: { poId } })
        }
      >
        {({ headerActions, content }) => (
          <>
            <PageLayout.Header
              title={null}
              leading={
                <DetailPageBackButton
                  to="/purchase-orders/$poId"
                  params={{ poId }}
                  aria-label="Back to purchase order detail"
                />
              }
              actions={headerActions}
            />
            <PageLayout.Content>{content}</PageLayout.Content>
          </>
        )}
      </PODetailContainer>
    </PageLayout>
  );
}
