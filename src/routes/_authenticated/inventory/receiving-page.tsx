/**
 * Receiving Page Component
 *
 * Goods receiving interface with form and history.
 *
 * @source products from useProducts hook
 * @source locations from useLocations hook
 * @source movements from useMovements hook
 *
 * @see src/routes/_authenticated/inventory/receiving.tsx - Route definition
 */
import { useState, useCallback } from "react";
import { History, Plus } from "lucide-react";
import { PageLayout } from "@/components/layout";
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
  const products: Product[] = (productsData?.products ?? []).map((p: ProductWithInventory) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    costPrice: p.costPrice,
  }));

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
