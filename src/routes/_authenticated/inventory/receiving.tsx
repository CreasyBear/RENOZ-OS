/**
 * Receiving Route
 *
 * Goods receiving interface with form and history.
 *
 * LAYOUT: full-width
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { History, Plus } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { FormSkeleton } from "@/components/skeletons/shared/form-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ReceivingForm,
  ReceivingHistory,
  type ReceivingRecord,
} from "@/components/domain/inventory";
import {
  useLocations,
  useMovements,
  useReceiveInventory,
} from "@/hooks/inventory";
import { useProducts } from "@/hooks/products";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/receiving" as any)({
  component: ReceivingPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Receive Inventory" description="Record incoming goods and update stock levels" />
      <PageLayout.Content>
        <FormSkeleton sections={2} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  sku: string;
  name: string;
  costPrice?: number | null;
}

interface Location {
  id: string;
  code: string;
  name: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ReceivingPage() {
  const [activeTab, setActiveTab] = useState<"receive" | "history">("receive");
  const [productSearch, setProductSearch] = useState("");

  // Data hooks - using TanStack Query via hooks
  const {
    data: productsData,
    isLoading: isLoadingProducts,
  } = useProducts({ search: productSearch, pageSize: 50 });

  const { locations: locationsData, isLoading: isLoadingLocations } = useLocations({
    autoFetch: true,
  });

  const {
    data: historyData,
    isLoading: isLoadingHistory,
  } = useMovements({ movementType: "receive", page: 1, pageSize: 50, sortOrder: 'desc' });

  // Mutation hook
  const receiveMutation = useReceiveInventory();

  // Transform data for components
  const products: Product[] = (productsData?.products ?? []).map((p: any) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    costPrice: p.costPrice,
  }));

  const locations: Location[] = locationsData.map((l: any) => ({
    id: l.id,
    code: l.code,
    name: l.name,
  }));

  const receivingHistory: ReceivingRecord[] = (historyData?.movements ?? []).map((m: any) => ({
    id: m.id,
    createdAt: new Date(m.createdAt),
    productId: m.productId,
    productName: m.product?.name ?? m.productId,
    productSku: m.product?.sku ?? "",
    locationId: m.locationId,
    locationName: m.location?.name ?? m.locationId,
    quantity: m.quantity,
    unitCost: m.unitCost ?? 0,
    totalCost: m.totalCost ?? 0,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    lotNumber: m.metadata?.lotNumber,
    batchNumber: m.metadata?.batchNumber,
    notes: m.notes,
  }));

  // Handle receive submission
  const handleReceive = useCallback(
    async (data: any) => {
      await receiveMutation.mutateAsync(data);
    },
    [receiveMutation]
  );

  // Handle product search
  const handleProductSearch = useCallback((query: string) => {
    setProductSearch(query);
  }, []);

  // Get default location (first one or marked as default)
  const defaultLocation = locations.find((l) => l.code === "MAIN") ?? locations[0];

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Receive Inventory"
        description="Record incoming goods and update stock levels"
      />

      <PageLayout.Content>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
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
              <ReceivingForm
                products={products}
                locations={locations}
                isLoadingProducts={isLoadingProducts}
                isLoadingLocations={isLoadingLocations}
                onSubmit={handleReceive}
                onProductSearch={handleProductSearch}
                defaultLocationId={defaultLocation?.id}
              />

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
      </PageLayout.Content>
    </PageLayout>
  );
}

export default ReceivingPage;
