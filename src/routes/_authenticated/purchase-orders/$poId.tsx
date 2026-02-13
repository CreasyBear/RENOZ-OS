/**
 * Purchase Order Detail Route
 *
 * Individual purchase order view with approval workflow and goods receipt.
 * Implements Container/Presenter pattern following Orders gold standard.
 *
 * @see SUPP-PO-MANAGEMENT, SUPP-APPROVAL-WORKFLOW, SUPP-GOODS-RECEIPT stories
 * @see src/components/domain/orders/containers/order-detail-container.tsx
 */

import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';
import { RouteErrorFallback, PageLayout, DetailPageBackButton } from '@/components/layout';
import { AdminDetailSkeleton } from '@/components/skeletons/admin';
import { PODetailContainer } from '@/components/domain/purchase-orders';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/purchase-orders/$poId')({
  component: PurchaseOrderDetailPage,
  errorComponent: PurchaseOrderDetailError,
  pendingComponent: () => <AdminDetailSkeleton />,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PurchaseOrderDetailPage() {
  const navigate = Route.useNavigate();
  const { poId } = Route.useParams();

  // Handlers
  const handleBack = useCallback(() => {
    navigate({ to: '/purchase-orders' });
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate({ to: '/purchase-orders/create', search: { editId: poId } });
  }, [navigate, poId]);

  return (
    <PageLayout variant="full-width">
      <PODetailContainer poId={poId} onBack={handleBack} onEdit={handleEdit}>
        {({ headerActions, content }) => (
          <>
            <PageLayout.Header
              title={null}
              leading={<DetailPageBackButton to="/purchase-orders" aria-label="Back to purchase orders" />}
              actions={headerActions}
            />
            <PageLayout.Content>{content}</PageLayout.Content>
          </>
        )}
      </PODetailContainer>
    </PageLayout>
  );
}

function PurchaseOrderDetailError({ error }: { error: Error }) {
  const router = useRouter();

  return (
    <RouteErrorFallback
      error={error}
      parentRoute="/purchase-orders"
      onRetry={() => router.invalidate()}
    />
  );
}
