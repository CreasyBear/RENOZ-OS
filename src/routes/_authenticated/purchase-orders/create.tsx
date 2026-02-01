/**
 * Purchase Order Creation Route
 *
 * 3-step wizard for creating purchase orders:
 * 1. Select Supplier
 * 2. Add Line Items
 * 3. Review & Submit
 *
 * @see _Initiation/_prd/sprints/sprint-01-route-cleanup.prd.json (SPRINT-01-005)
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  POCreationWizard,
  type SupplierItem,
  type ProductItem,
} from "@/components/domain/suppliers/po-creation-wizard";
import { useSuppliers } from "@/hooks/suppliers";
import { useProducts } from "@/hooks/products";
import { useCreatePurchaseOrder } from "@/hooks/suppliers/use-purchase-orders";
import { toast } from "@/hooks";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/purchase-orders/create")({
  component: PurchaseOrderCreatePage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/purchase-orders" />
  ),
});

// ============================================================================
// MAIN COMPONENT (Container)
// ============================================================================

function PurchaseOrderCreatePage() {
  const navigate = useNavigate();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data: suppliersData, isLoading: isLoadingSuppliers } = useSuppliers({
    page: 1,
    pageSize: 100,
  });

  const { data: productsData, isLoading: isLoadingProducts } = useProducts({
    page: 1,
    pageSize: 100,
    isActive: true,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const createMutation = useCreatePurchaseOrder();

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCancel = useCallback(() => {
    navigate({ to: "/purchase-orders" });
  }, [navigate]);

  const handleSubmit = useCallback(
    async (formData: {
      supplierId: string;
      expectedDeliveryDate?: string;
      paymentTerms?: string;
      notes?: string;
      items: Array<{
        productId?: string;
        productName: string;
        productSku?: string;
        description?: string;
        quantity: number;
        unitPrice: number;
        notes?: string;
      }>;
    }) => {
      try {
        // Transform items to match server function schema
        const items = formData.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
        }));

        const result = await createMutation.mutateAsync({
          supplierId: formData.supplierId,
          expectedDeliveryDate: formData.expectedDeliveryDate,
          paymentTerms: formData.paymentTerms,
          notes: formData.notes,
          items,
        });

        toast.success("Purchase order created successfully", {
          description: `PO Number: ${result.poNumber || "N/A"}`,
        });

        // Navigate to the new PO detail page
        navigate({
          to: "/purchase-orders/$poId",
          params: { poId: result.id },
        });
      } catch (error) {
        console.error("Failed to create purchase order:", error);
        toast.error("Failed to create purchase order", {
          description:
            error instanceof Error ? error.message : "An unexpected error occurred",
        });
        throw error;
      }
    },
    [createMutation, navigate]
  );

  // ============================================================================
  // DATA TRANSFORMATION
  // ============================================================================

  const suppliers = (suppliersData?.items || []) as SupplierItem[];
  // Map ProductWithInventory to ProductItem (ProductItem is a subset of ProductWithInventory)
  const products: ProductItem[] = (productsData?.products || []).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    basePrice: product.basePrice ? Number(product.basePrice) : null,
    costPrice: product.costPrice ? Number(product.costPrice) : null,
    status: product.status,
    isActive: product.isActive,
  }));

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoadingSuppliers || isLoadingProducts) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Create Purchase Order"
          description="Create a new purchase order for a supplier"
          actions={
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />
        <PageLayout.Content>
          <div className="space-y-4">
            <div className="h-24 bg-muted rounded animate-pulse" />
            <div className="h-96 bg-muted rounded animate-pulse" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Create Purchase Order"
        description="Create a new purchase order for a supplier"
        actions={
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <PageLayout.Content>
        <POCreationWizard
          suppliers={suppliers}
          products={products}
          isSubmitting={createMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}

export default PurchaseOrderCreatePage;
