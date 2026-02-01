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
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import { buttonVariants } from '@/components/ui/button';
import { SupplierDetailContainer } from '@/components/domain/suppliers';
import { cn } from '@/lib/utils';

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
        {({ headerTitle, headerActions, content }) => (
          <>
            <PageLayout.Header
              title={headerTitle}
              actions={
                <div className="flex items-center gap-2">
                  <Link
                    to="/suppliers"
                    className={cn(buttonVariants({ variant: 'outline' }))}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Link>
                  {headerActions}
                </div>
              }
            />
            <PageLayout.Content className="p-0">
              {content}
            </PageLayout.Content>
          </>
        )}
      </SupplierDetailContainer>
    </PageLayout>
  );
}
