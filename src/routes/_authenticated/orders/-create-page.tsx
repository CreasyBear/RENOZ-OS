/**
 * Order Creation Page
 *
 * Extracted for code-splitting - see create.tsx for route definition.
 * Supports initialCustomerId from URL search (?customerId=) for customer-context entry points.
 */
import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageLayout } from "@/components/layout";
import { OrderCreationWizard } from "@/components/domain/orders/creation/order-creation-wizard";
import type { OrderSubmitData } from "@/lib/schemas/orders";
import { useCreateOrder } from "@/hooks/orders/use-orders";

export interface OrderCreatePageProps {
  initialCustomerId?: string;
}

export default function OrderCreatePage({ initialCustomerId }: OrderCreatePageProps) {
  const navigate = useNavigate();
  const createMutation = useCreateOrder();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleComplete = useCallback(
    (orderId: string) => {
      navigate({
        to: "/orders/$orderId",
        params: { orderId },
      });
    },
    [navigate]
  );

  const handleCancelClick = useCallback(() => {
    setCancelDialogOpen(true);
  }, []);

  const handleCancelConfirm = useCallback(() => {
    setCancelDialogOpen(false);
    navigate({ to: "/orders" });
  }, [navigate]);

  const handleCancelDialogClose = useCallback((open: boolean) => {
    if (!open) setCancelDialogOpen(false);
  }, []);

  const handleSubmit = useCallback(
    async (data: OrderSubmitData): Promise<{ id: string; orderNumber: string }> => {
      const formatDate = (d: Date | null | undefined) =>
        d ? d.toISOString().split('T')[0] : undefined;
      const result = await createMutation.mutateAsync({
        customerId: data.customerId,
        status: data.status,
        paymentStatus: data.paymentStatus,
        orderDate: formatDate(data.orderDate),
        dueDate: formatDate(data.dueDate),
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount,
        shippingAmount: data.shippingAmount,
        internalNotes: data.internalNotes,
        customerNotes: data.customerNotes,
        lineItems: data.lineItems.map((item) => ({
          ...item,
          taxType: item.taxType,
        })),
        metadata: {},
      });
      return { id: result.id, orderNumber: result.orderNumber };
    },
    [createMutation]
  );

  return (
    <>
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Create Order"
          description="Create a new customer order"
        />
        <PageLayout.Content>
          <OrderCreationWizard
            initialCustomerId={initialCustomerId}
            onComplete={handleComplete}
            onCancel={handleCancelClick}
            onSubmit={handleSubmit}
            isSubmitting={createMutation.isPending}
          />
        </PageLayout.Content>
      </PageLayout>

      <AlertDialog open={cancelDialogOpen} onOpenChange={handleCancelDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your order details will be lost. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
