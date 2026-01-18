/**
 * Order Detail Route
 *
 * Individual order view with tabs for overview, items, fulfillment, and activity.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-DETAIL-UI)
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PageLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { OrderDetail } from "@/components/domain/orders";
import { duplicateOrder } from "@/lib/server/functions/orders";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  component: OrderDetailPage,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function OrderDetailPage() {
  const navigate = useNavigate();
  const { orderId } = Route.useParams();
  const queryClient = useQueryClient();

  // Duplicate order mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      return duplicateOrder({ data: { id } });
    },
    onSuccess: (result) => {
      toastSuccess(`Order duplicated as ${result.orderNumber}`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate({
        to: "/orders/$orderId",
        params: { orderId: result.id },
      });
    },
    onError: () => {
      toastError("Failed to duplicate order");
    },
  });

  // Handlers
  const handleBack = useCallback(() => {
    navigate({ to: "/orders" });
  }, [navigate]);

  const handleEdit = useCallback(() => {
    // Navigate to edit mode (could be same page with edit=true param or separate route)
    navigate({
      to: "/orders/$orderId",
      params: { orderId },
      search: { edit: true },
    });
  }, [navigate, orderId]);

  const handleDuplicate = useCallback(() => {
    duplicateMutation.mutate(orderId);
  }, [duplicateMutation, orderId]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <PageLayout>
      <PageLayout.Header
        title="Order Details"
        description="View and manage order information"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </PageLayout.Header>

      <PageLayout.Content>
        <OrderDetail
          orderId={orderId}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onPrint={handlePrint}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}

export default OrderDetailPage;
