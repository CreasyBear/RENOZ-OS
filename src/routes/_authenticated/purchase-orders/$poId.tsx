/**
 * Purchase Order Detail Route
 *
 * Individual purchase order view with approval workflow and goods receipt.
 * Implements Container/Presenter pattern following Orders gold standard.
 *
 * @see SUPP-PO-MANAGEMENT, SUPP-APPROVAL-WORKFLOW, SUPP-GOODS-RECEIPT stories
 * @see src/components/domain/orders/containers/order-detail-container.tsx
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminDetailSkeleton } from '@/components/skeletons/admin';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { ReceiptCreationDialog } from '@/components/domain/receipts';
import { PODetailContainer } from '@/components/domain/purchase-orders';
import { usePurchaseOrder } from '@/hooks/suppliers';
import { queryKeys } from '@/lib/query-keys';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/purchase-orders/$poId')({
  component: PurchaseOrderDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/purchase-orders" />
  ),
  pendingComponent: () => <AdminDetailSkeleton />,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PurchaseOrderDetailPage() {
  const navigate = Route.useNavigate();
  const { poId } = Route.useParams();
  const queryClient = useQueryClient();
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  // Fetch purchase order for receipt dialog (container handles its own fetching)
  const { data: po } = usePurchaseOrder(poId);

  // Handlers
  const handleBack = useCallback(() => {
    navigate({ to: '/purchase-orders' });
  }, [navigate]);

  const handleEdit = useCallback(() => {
    // Navigate to edit page (if it exists)
    navigate({ to: '/purchase-orders/create', search: { editId: poId } });
  }, [navigate, poId]);

  const handleReceiveGoods = useCallback(() => {
    setShowReceiptDialog(true);
  }, []);

  const handleReceiptSuccess = useCallback(() => {
    toast.success('Goods receipt recorded');
    queryClient.invalidateQueries({
      queryKey: queryKeys.suppliers.purchaseOrderDetail(poId),
    });
    setShowReceiptDialog(false);
  }, [queryClient, poId]);

  return (
    <PageLayout variant="full-width">
      <PODetailContainer
        poId={poId}
        onBack={handleBack}
        onEdit={handleEdit}
        onReceiveGoods={handleReceiveGoods}
      >
        {({ headerTitle, headerActions, content }) => (
          <>
            <PageLayout.Header
              title={
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {headerTitle}
                </div>
              }
              actions={headerActions}
            />
            <PageLayout.Content noPadding>{content}</PageLayout.Content>
          </>
        )}
      </PODetailContainer>

      {/* Receipt Creation Dialog */}
      {po && (
        <ReceiptCreationDialog
          open={showReceiptDialog}
          onOpenChange={setShowReceiptDialog}
          purchaseOrderId={po.id}
          poNumber={po.poNumber}
          supplierName={po.supplierName || null}
          items={(po.items || []).map((item) => ({
            id: item.id,
            productName: item.productName || 'Unknown Product',
            productSku: item.productSku || undefined,
            unit: item.unitOfMeasure || undefined,
            quantityOrdered: Number(item.quantity) || 0,
            quantityAlreadyReceived: Number(item.quantityReceived) || 0,
            quantityPending: Math.max(
              0,
              (Number(item.quantity) || 0) - (Number(item.quantityReceived) || 0)
            ),
          }))}
          onSuccess={handleReceiptSuccess}
        />
      )}
    </PageLayout>
  );
}
