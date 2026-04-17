/**
 * Receiving Page Component
 *
 * Manual non-PO receiving interface with form and history.
 *
 * @source products from useProducts hook
 * @source locations from useLocations hook
 * @source movements from useMovements hook
 *
 * @see src/routes/_authenticated/inventory/receiving.tsx - Route definition
 */
import { useState, useCallback } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, History, Plus, TriangleAlert } from "lucide-react";
import { PageLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReceivingForm } from "@/components/domain/inventory/receiving/receiving-form";
import { ReceivingHistory, type ReceivingRecord } from "@/components/domain/inventory/receiving/receiving-history";
import {
  useLocations,
  useMovements,
  useReceiveInventory,
} from "@/hooks/inventory";
import { useProduct, useProducts } from "@/hooks/products";
import type { ProductWithInventory } from "@/lib/schemas/products";
import type { HookWarehouseLocation } from "@/lib/schemas/inventory";
import type { MovementWithRelations, ListMovementsResult } from "@/lib/schemas/inventory";
import type { receiveInventory } from "@/server/functions/inventory/inventory";

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  sku: string;
  name: string;
  costPrice?: number | null;
  isSerialized?: boolean;
}

interface Location {
  id: string;
  code: string;
  name: string;
}

type ReceiveInventoryInput = Parameters<typeof receiveInventory>[0]['data'];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ReceivingPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/inventory/receiving" });
  const [activeTab, setActiveTab] = useState<"receive" | "history">("receive");
  const [productSearch, setProductSearch] = useState("");

  // Data hooks - using TanStack Query via hooks
  const {
    data: productsData,
    isLoading: isLoadingProducts,
  } = useProducts({ search: productSearch, pageSize: 50 });
  const {
    data: selectedProductData,
    error: selectedProductError,
    isLoading: isLoadingSelectedProduct,
  } = useProduct(search.productId ?? "", !!search.productId);

  const {
    locations: locationsData,
    isLoading: isLoadingLocations,
    locationsError,
    fetchLocations,
  } = useLocations({
    autoFetch: true,
  });

  const {
    data: historyData,
    isLoading: isLoadingHistory,
  } = useMovements({ movementType: "receive", page: 1, pageSize: 50, sortOrder: 'desc' });

  // Mutation hook
  const receiveMutation = useReceiveInventory();

  // Transform data for components
  const productsFromSearch: Product[] = (productsData?.products ?? []).map((p: ProductWithInventory) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    costPrice: p.costPrice,
    isSerialized: p.isSerialized,
  }));

  const selectedProduct = selectedProductData?.product
    ? {
        id: selectedProductData.product.id,
        sku: selectedProductData.product.sku,
        name: selectedProductData.product.name,
        costPrice: selectedProductData.product.costPrice,
        isSerialized: selectedProductData.product.isSerialized,
      }
    : null;

  const products: Product[] = selectedProduct && !productsFromSearch.some((item) => item.id === selectedProduct.id)
    ? [selectedProduct, ...productsFromSearch]
    : productsFromSearch;
  const hasProductContext = search.source === "product_detail" && !!search.productId;
  const hasContextFailure =
    hasProductContext && !isLoadingSelectedProduct && (!!selectedProductError || !selectedProduct);

  const locations: Location[] = locationsData.map((l: HookWarehouseLocation) => ({
    id: l.id,
    code: l.code,
    name: l.name,
  }));

  const movements = (historyData as ListMovementsResult | undefined)?.movements ?? [];
  const receivingHistory: ReceivingRecord[] = movements.map((m: MovementWithRelations) => ({
    id: m.id,
    createdAt: new Date(m.createdAt),
    productId: m.productId,
    productName: m.productName ?? m.productId,
    productSku: m.productSku ?? "",
    locationId: m.locationId,
    locationName: m.locationName ?? m.locationId,
    quantity: m.quantity,
    unitCost: m.unitCost ?? 0,
    totalCost: m.totalCost ?? 0,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    lotNumber: (m.metadata as { lotNumber?: string } | null)?.lotNumber,
    batchNumber: (m.metadata as { batchNumber?: string } | null)?.batchNumber,
    notes: m.notes,
  }));

  // Handle receive submission
  const handleReceive = useCallback(
    async (data: ReceiveInventoryInput) => {
      await receiveMutation.mutateAsync(data);
      if (search.returnToProductId) {
        navigate({
          to: "/products/$productId",
          params: { productId: search.returnToProductId },
          replace: true,
        });
      }
    },
    [navigate, receiveMutation, search.returnToProductId]
  );

  const handleCancel = useCallback(() => {
    if (search.returnToProductId) {
      navigate({
        to: "/products/$productId",
        params: { productId: search.returnToProductId },
        replace: true,
      });
      return;
    }

    navigate({ to: "/inventory" });
  }, [navigate, search.returnToProductId]);

  const handleContinueGenericReceive = useCallback(() => {
    navigate({
      to: "/inventory/receiving",
      search: {},
      replace: true,
    });
  }, [navigate]);

  // Handle product search
  const handleProductSearch = useCallback((query: string) => {
    setProductSearch(query);
  }, []);

  // Get default location (first one or marked as default)
  const defaultLocation = locations.find((l) => l.code === "MAIN") ?? locations[0];
  const headerTitle = hasProductContext && selectedProduct
    ? `Receive Inventory for ${selectedProduct.name}`
    : "Receive Inventory";
  const headerDescription = hasProductContext && selectedProduct
    ? `Record non-PO inbound stock for ${selectedProduct.sku ? `${selectedProduct.name} (${selectedProduct.sku})` : selectedProduct.name}`
    : "Record non-PO inbound stock and update inventory levels";
  const hasUnavailableLocations = !!locationsError && !isLoadingLocations && locations.length === 0;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={headerTitle}
        description={headerDescription}
        actions={
          search.returnToProductId ? (
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Product
            </Button>
          ) : undefined
        }
      />

      <PageLayout.Content>
        {hasContextFailure ? (
          <Alert className="mb-6">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Product context is no longer available</AlertTitle>
            <AlertDescription>
              The product you launched this receive flow from could not be loaded. You can return
              to the product detail view or continue with a generic non-PO receipt.
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {search.returnToProductId ? (
                  <Button variant="outline" onClick={handleCancel}>
                    Back to Product
                  </Button>
                ) : null}
                <Button onClick={handleContinueGenericReceive}>Continue Without Product Context</Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {!hasContextFailure ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="mb-6">
            <TabsTrigger value="receive">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Receive
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" aria-hidden="true" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receive">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                {hasUnavailableLocations ? (
                  <Alert>
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Warehouse locations are temporarily unavailable</AlertTitle>
                    <AlertDescription>
                      {locationsError.message}
                      <div className="mt-3">
                        <Button variant="outline" onClick={() => void fetchLocations()}>
                          Retry Locations
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ReceivingForm
                    products={products}
                    locations={locations}
                    isLoadingProducts={isLoadingProducts}
                    isLoadingLocations={isLoadingLocations}
                    onSubmit={handleReceive}
                    onCancel={handleCancel}
                    onProductSearch={handleProductSearch}
                    defaultLocationId={defaultLocation?.id}
                    defaultProductId={search.productId}
                    lockProductSelection={hasProductContext && !!selectedProduct}
                    submitError={receiveMutation.error?.message ?? null}
                  />
                )}
              </div>

              {/* Recent receives sidebar */}
              <ReceivingHistory
                records={receivingHistory.slice(0, 5)}
                isLoading={isLoadingHistory}
                showTitle={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="history">
            <ReceivingHistory
              records={receivingHistory}
              isLoading={isLoadingHistory}
              showTitle={false}
            />
          </TabsContent>
          </Tabs>
        ) : null}
      </PageLayout.Content>
    </PageLayout>
  );
}
