/**
 * Purchase Order Creation Page
 *
 * Extracted for code-splitting - see create.tsx for route definition.
 */
import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageLayout } from "@/components/layout";
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
import { logger } from "@/lib/logger";

interface PurchaseOrderCreatePageProps {
  search: {
    supplierId?: string;
  };
}

export default function PurchaseOrderCreatePage({ search }: PurchaseOrderCreatePageProps) {
  const navigate = useNavigate();
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useSuppliers({
    page: 1,
    pageSize: 100,
  });
  const { data: productsData, isLoading: isLoadingProducts } = useProducts({
    page: 1,
    pageSize: 100,
    isActive: true,
  });
  const createMutation = useCreatePurchaseOrder();

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
        navigate({
          to: "/purchase-orders/$poId",
          params: { poId: result.id },
        });
      } catch (error) {
        logger.error("Failed to create purchase order", error);
        toast.error("Failed to create purchase order", {
          description:
            error instanceof Error ? error.message : "An unexpected error occurred",
        });
        throw error;
      }
    },
    [createMutation, navigate]
  );

  const suppliers = (suppliersData?.items || []) as SupplierItem[];
  const products: ProductItem[] = (productsData?.products || []).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description ?? null,
    basePrice: product.basePrice ? Number(product.basePrice) : null,
    costPrice: product.costPrice ? Number(product.costPrice) : null,
    status: product.status,
    isActive: product.isActive,
  }));

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
          initialSupplierId={search.supplierId ?? null}
          isSubmitting={createMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
