/**
 * Supplier Detail Route
 *
 * Shows the supplier detail view with contact info, performance metrics,
 * purchase orders, and price agreements.
 *
 * Uses the Container/Presenter pattern following Orders gold standard.
 *
 * @see SUPP-SUPPLIER-DETAIL story
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback, DetailPageBackButton } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import { SupplierDetailContainer } from '@/components/domain/suppliers';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/suppliers/$supplierId')({
  component: SupplierDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/suppliers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <AdminTableSkeleton />
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function SupplierDetailPage() {
  const { supplierId } = Route.useParams();
  const navigate = useNavigate();

  return (
    <PageLayout variant="full-width">
      <SupplierDetailContainer
        supplierId={supplierId}
        onBack={() => navigate({ to: '/suppliers' })}
        onEdit={() => navigate({ to: '/suppliers/$supplierId/edit', params: { supplierId } })}
        onViewPurchaseOrders={() => navigate({ to: '/purchase-orders', search: { supplierId } })}
        onCreatePurchaseOrder={() => navigate({ to: '/purchase-orders/create', search: { supplierId } })}
      >
        {({ headerActions, content }) => (
          <>
            <PageLayout.Header
              title={null}
              leading={<DetailPageBackButton to="/suppliers" aria-label="Back to suppliers" />}
              actions={headerActions}
            />
            <PageLayout.Content className="p-0">{content}</PageLayout.Content>
          </>
        )}
      </SupplierDetailContainer>
    </PageLayout>
  );
}
