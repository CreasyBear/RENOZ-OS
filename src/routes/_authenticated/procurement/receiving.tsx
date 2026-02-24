/**
 * Procurement Receiving Route
 *
 * Operations dashboard for goods receiving workflow.
 * Dedicated page for receiving goods against purchase orders.
 *
 * @source receivingDialog from useReceivingDialog hook
 *
 * @see docs/design-system/DASHBOARD-STANDARDS.md (Operational Dashboard)
 * @see docs/design-system/WORKFLOW-CONTINUITY-STANDARDS.md
 * @see src/routes/_authenticated/orders/fulfillment.tsx (reference)
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { ReceivingDashboardContainer } from "@/components/domain/procurement/receiving/receiving-dashboard-container";
import { ReceivingDialogWrapper } from "@/components/domain/purchase-orders/receive/receiving-dialog-wrapper";
import { useReceivingDialog } from "@/hooks/purchase-orders/use-receiving-dialog";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/procurement/receiving")({
  component: ReceivingPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/procurement" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Goods Receiving"
        description="Receive goods against purchase orders"
      />
      <PageLayout.Content>
        <div className="space-y-4">
          <div className="h-20 bg-muted animate-pulse rounded-lg" />
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ReceivingPage() {
  const navigate = Route.useNavigate();
  // Receiving dialog state (for single PO receiving)
  const receivingDialog = useReceivingDialog({
    syncWithUrl: true,
    urlParamName: 'receive',
  });

  // Handlers
  const handleViewPO = useCallback((poId: string) => {
    navigate({ to: '/purchase-orders/$poId', params: { poId } });
  }, [navigate]);

  const handleReceivePO = useCallback((poId: string) => {
    receivingDialog.openDialog(poId);
  }, [receivingDialog]);

  const handleReceiptComplete = useCallback(() => {
    receivingDialog.closeDialog();
    // Refetch will happen automatically via query invalidation
  }, [receivingDialog]);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Goods Receiving"
        description="Receive goods against purchase orders and update inventory"
      />
      <PageLayout.Content>
        <ReceivingDashboardContainer
          onViewPO={handleViewPO}
          onReceivePO={handleReceivePO}
        />
      </PageLayout.Content>

      {/* Receiving Dialog */}
      {receivingDialog.isOpen && receivingDialog.selectedPOId && (
        <ReceivingDialogWrapper
          open={receivingDialog.isOpen}
          onOpenChange={receivingDialog.onOpenChange}
          poId={receivingDialog.selectedPOId}
          onReceiptComplete={handleReceiptComplete}
        />
      )}
    </PageLayout>
  );
}
