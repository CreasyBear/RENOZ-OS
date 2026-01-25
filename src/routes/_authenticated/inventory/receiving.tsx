/**
 * Receiving Route
 *
 * Goods receiving interface with form and history.
 *
 * Features:
 * - Receive new inventory
 * - View receiving history
 * - Quick receive mode
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { History, Plus } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { FormSkeleton } from "@/components/skeletons/shared/form-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks";
import { ReceivingForm } from "@/components/domain/inventory";
import {
  ReceivingHistory,
  type ReceivingRecord,
} from "@/components/domain/inventory";
import { receiveInventory, listMovements } from "@/server/functions/inventory";
import { listLocations } from "@/server/functions/locations";
import { listProducts } from "@/lib/server/functions/products";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/receiving" as any)({
  component: ReceivingPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="container">
      <PageLayout.Header title="Receive Inventory" />
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

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [receivingHistory, setReceivingHistory] = useState<ReceivingRecord[]>([]);

  // Loading states
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Fetch products
  const fetchProducts = useCallback(async (search?: string) => {
    try {
      setIsLoadingProducts(true);
      const data = await listProducts({
        data: { page: 1, pageSize: 50, search },
      });
      if (data?.products) {
        setProducts(
          data.products.map((p: any) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            costPrice: p.costPrice,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      setIsLoadingLocations(true);
      const data = await listLocations({ data: { page: 1, pageSize: 100 } });
      if (data?.locations) {
        setLocations(
          data.locations.map((l: any) => ({
            id: l.id,
            code: l.code,
            name: l.name,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setIsLoadingLocations(false);
    }
  }, []);

  // Fetch receiving history (movements with type "receive")
  const fetchHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const data = await listMovements({
        data: { page: 1, pageSize: 50, movementType: "receive" },
      }) as any;
      if (data?.movements) {
        // We need to map movement data to ReceivingRecord format
        // This is a simplified version - in production you'd join with products/locations
        setReceivingHistory(
          data.movements.map((m: any) => ({
            id: m.id,
            createdAt: new Date(m.createdAt),
            productId: m.productId,
            productName: m.productId, // TODO: Join with product
            productSku: "", // TODO: Join with product
            locationId: m.locationId,
            locationName: m.locationId, // TODO: Join with location
            quantity: m.quantity,
            unitCost: m.unitCost ?? 0,
            totalCost: m.totalCost ?? 0,
            referenceType: m.referenceType,
            referenceId: m.referenceId,
            lotNumber: m.metadata?.lotNumber,
            batchNumber: m.metadata?.batchNumber,
            notes: m.notes,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
    fetchLocations();
    fetchHistory();
  }, []);

  // Handle receive submission
  const handleReceive = useCallback(
    async (data: any) => {
      try {
        await receiveInventory({ data });
        toast.success("Inventory received", {
          description: `${data.quantity} units added to inventory`,
        });
        fetchHistory();
      } catch (error: any) {
        toast.error(error.message || "Failed to receive inventory");
        throw error;
      }
    },
    [fetchHistory]
  );

  // Handle product search
  const handleProductSearch = useCallback(
    (query: string) => {
      fetchProducts(query);
    },
    [fetchProducts]
  );

  // Get default location (first one or marked as default)
  const defaultLocation = locations.find((l) => l.code === "MAIN") ?? locations[0];

  return (
    <PageLayout variant="container">
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
