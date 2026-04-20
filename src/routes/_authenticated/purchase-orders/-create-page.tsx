/**
 * Purchase Order Creation Page
 *
 * Extracted for code-splitting - see create.tsx for route definition.
 */
import { useCallback, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Package, TriangleAlert } from "lucide-react";
import { PageLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  POCreationWizard,
  type SupplierItem,
  type ProductItem,
  type PurchaseOrderItemFormData,
} from "@/components/domain/suppliers/po-creation-wizard";
import { usePriceLists, useSuppliers } from "@/hooks/suppliers";
import { useProduct, useProducts } from "@/hooks/products";
import { useCreatePurchaseOrder } from "@/hooks/suppliers/use-purchase-orders";
import { toast } from "@/hooks";
import { logger } from "@/lib/logger";

interface PurchaseOrderCreatePageProps {
  search: {
    supplierId?: string;
    productId?: string;
    source?: "product_detail" | "inventory_alert" | "supplier_detail";
    returnToProductId?: string;
  };
}

export default function PurchaseOrderCreatePage({ search }: PurchaseOrderCreatePageProps) {
  const navigate = useNavigate();
  const {
    data: suppliersData,
    isLoading: isLoadingSuppliers,
    error: suppliersError,
  } = useSuppliers({
    page: 1,
    pageSize: 100,
  });
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    error: productsError,
  } = useProducts({
    page: 1,
    pageSize: 100,
    isActive: true,
  });
  const {
    data: selectedProductData,
    error: selectedProductError,
    isLoading: isLoadingSelectedProduct,
  } = useProduct(search.productId ?? "", !!search.productId);
  const {
    data: preferredPriceLists,
    error: preferredPriceListsError,
    isLoading: isLoadingPreferredPriceLists,
  } = usePriceLists({
    productId: search.productId,
    status: "active",
    isPreferred: true,
    page: 1,
    pageSize: 1,
    enabled: !!search.productId && !search.supplierId,
  });
  const createMutation = useCreatePurchaseOrder();

  const handleCancel = useCallback(() => {
    if (search.returnToProductId) {
      navigate({
        to: "/products/$productId",
        params: { productId: search.returnToProductId },
      });
      return;
    }

    navigate({ to: "/purchase-orders" });
  }, [navigate, search.returnToProductId]);

  const handleClearContext = useCallback(() => {
    navigate({
      to: "/purchase-orders/create",
      search: {},
      replace: true,
    });
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
  const selectedProduct = selectedProductData?.product;
  const selectedProductItem = useMemo<ProductItem | null>(
    () =>
      selectedProduct
        ? {
            id: selectedProduct.id,
            name: selectedProduct.name,
            sku: selectedProduct.sku,
            description: selectedProduct.description ?? null,
            basePrice: selectedProduct.basePrice ? Number(selectedProduct.basePrice) : null,
            costPrice: selectedProduct.costPrice ? Number(selectedProduct.costPrice) : null,
            status: selectedProduct.status,
            isActive: selectedProduct.isActive,
          }
        : null,
    [selectedProduct]
  );
  const productsFromList: ProductItem[] = (productsData?.products || []).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description ?? null,
    basePrice: product.basePrice ? Number(product.basePrice) : null,
    costPrice: product.costPrice ? Number(product.costPrice) : null,
    status: product.status,
    isActive: product.isActive,
  }));
  const products: ProductItem[] = selectedProductItem && !productsFromList.some((product) => product.id === selectedProductItem.id)
    ? [selectedProductItem, ...productsFromList]
    : productsFromList;
  const resolvedSupplierId = search.supplierId ?? preferredPriceLists?.items?.[0]?.supplierId ?? null;
  const shouldWaitForPreferredSupplier =
    !!search.productId && !search.supplierId && isLoadingPreferredPriceLists;
  const seededItems = useMemo<PurchaseOrderItemFormData[]>(
    () =>
      selectedProductItem
        ? [
            {
              productId: selectedProductItem.id,
              productName: selectedProductItem.name,
              productSku: selectedProductItem.sku ?? undefined,
              description: selectedProductItem.description ?? undefined,
              quantity: 1,
              unitPrice: selectedProductItem.costPrice ?? selectedProductItem.basePrice ?? 0,
            },
          ]
        : [],
    [selectedProductItem]
  );
  const hasProductContext = !!search.productId;
  const hasInvalidContext =
    hasProductContext &&
    !isLoadingSelectedProduct &&
    (!selectedProductItem || !selectedProductItem.isActive);
  const hasDegradedProductContext = !!selectedProductError && !!selectedProductItem;
  const headerTitle = selectedProductItem && search.source === "product_detail"
    ? `Order Stock for ${selectedProductItem.name}`
    : "Create Purchase Order";
  const headerDescription = selectedProductItem && search.source === "product_detail"
    ? "Create a purchase order for this product using the standard procurement workflow"
    : "Create a new purchase order for a supplier";

  if (
    isLoadingSuppliers ||
    isLoadingProducts ||
    (hasProductContext && isLoadingSelectedProduct) ||
    shouldWaitForPreferredSupplier
  ) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header
          title={headerTitle}
          description={headerDescription}
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
        title={headerTitle}
        description={headerDescription}
        actions={
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {search.returnToProductId ? "Back to Product" : "Back"}
          </Button>
        }
      />
      <PageLayout.Content>
        {hasInvalidContext ? (
          <Alert className="mb-6">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Product context is no longer available</AlertTitle>
            <AlertDescription>
              The product you launched this order flow from is missing or inactive, so we can’t
              safely prefill the purchase order.
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {search.returnToProductId ? (
                  <Button variant="outline" onClick={handleCancel}>
                    Back to Product
                  </Button>
                ) : null}
                <Button onClick={handleClearContext}>Continue With Generic PO Create</Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {selectedProductItem && !hasInvalidContext ? (
          <Alert className="mb-6">
            <Package className="h-4 w-4" />
            <AlertTitle>Ordering stock for {selectedProductItem.name}</AlertTitle>
            <AlertDescription>
              This purchase order starts with {selectedProductItem.sku ? `${selectedProductItem.name} (${selectedProductItem.sku})` : selectedProductItem.name} already seeded as the first line item.
            </AlertDescription>
          </Alert>
        ) : null}

        {hasDegradedProductContext ? (
          <Alert className="mb-6">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Product details unavailable</AlertTitle>
            <AlertDescription>
              Showing the most recent product context while refresh is unavailable.
            </AlertDescription>
          </Alert>
        ) : null}

        {suppliersError instanceof Error ? (
          <Alert className="mb-6" variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Supplier list unavailable</AlertTitle>
            <AlertDescription>
              Supplier options could not be loaded. You can stay on this page, but you may need to refresh before you can submit a purchase order.
            </AlertDescription>
          </Alert>
        ) : null}

        {productsError instanceof Error ? (
          <Alert className="mb-6">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Product catalog unavailable</AlertTitle>
            <AlertDescription>
              Product options could not be refreshed. Any products already loaded remain usable.
            </AlertDescription>
          </Alert>
        ) : null}

        {preferredPriceListsError instanceof Error ? (
          <Alert className="mb-6">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Preferred supplier pricing unavailable</AlertTitle>
            <AlertDescription>
              Preferred supplier pricing could not be loaded for this product. You can still create the purchase order manually.
            </AlertDescription>
          </Alert>
        ) : null}

        {!hasInvalidContext ? (
        <POCreationWizard
          key={`${search.productId ?? "generic"}:${resolvedSupplierId ?? "no-supplier"}`}
          suppliers={suppliers}
          products={products}
          initialSupplierId={resolvedSupplierId}
          initialItems={seededItems}
          initialStep={resolvedSupplierId ? 2 : 1}
          isSubmitting={createMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
        ) : null}
      </PageLayout.Content>
    </PageLayout>
  );
}
