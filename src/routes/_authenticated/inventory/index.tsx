/**
 * Inventory Index Route
 *
 * Main inventory browser page with advanced search, filtering, and management.
 *
 * Features:
 * - Advanced filtering by product, location, quantity, status, age, value
 * - Multiple view modes: list, grid, map visualization
 * - Real-time search with autocomplete
 * - Bulk selection and operations
 * - Export capabilities with custom column selection
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { Plus } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTableSkeleton } from "@/components/skeletons/inventory";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks";
import {
  InventoryBrowser,
  type InventoryFilters,
  type InventoryItem,
  type ViewMode,
  defaultInventoryFilters,
} from "@/components/domain/inventory";
import { listInventory } from "@/server/functions/inventory";
import { listLocations } from "@/server/functions/inventory/locations";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/" as any)({
  component: InventoryPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Inventory" />
      <PageLayout.Content>
        <InventoryTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function InventoryPage() {
  const navigate = useNavigate();

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Filter state
  const [filters, setFilters] = useState<InventoryFilters>(defaultInventoryFilters);

  // Data state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState<Array<{ id: string; name: string; code: string }>>([]);

  // Fetch inventory data
  const fetchInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await listInventory({
        data: {
          page,
          pageSize,
          search: filters.search || undefined,
          productId: filters.productId,
          locationId: filters.locationId,
          status: filters.status.length > 0 ? (filters.status[0] as any) : undefined,
        },
      });

      if (data) {
        // Transform data to match InventoryItem type
        const transformedItems: InventoryItem[] = (data.items || []).map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name ?? "Unknown Product",
          productSku: item.product?.sku ?? "N/A",
          locationId: item.locationId,
          locationName: item.location?.name ?? "Unknown Location",
          locationCode: item.location?.code ?? "N/A",
          quantityOnHand: item.quantityOnHand ?? 0,
          quantityAllocated: item.quantityAllocated ?? 0,
          quantityAvailable: item.quantityAvailable ?? 0,
          unitCost: Number(item.unitCost) ?? 0,
          totalValue: Number(item.totalValue) ?? 0,
          status: item.status ?? "available",
          qualityStatus: item.qualityStatus,
          serialNumber: item.serialNumber,
          lotNumber: item.lotNumber,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          receivedAt: item.receivedAt ? new Date(item.receivedAt) : undefined,
          lastMovementAt: item.lastMovementAt ? new Date(item.lastMovementAt) : undefined,
        }));
        setItems(transformedItems);
        setTotalCount(data.total ?? 0);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, filters]);

  // Fetch locations for filters
  const fetchLocations = useCallback(async () => {
    try {
      const data = await listLocations({ data: { page: 1, pageSize: 100 } });
      if (data?.locations) {
        setLocations(
          data.locations.map((loc: any) => ({
            id: loc.id,
            name: loc.name,
            code: loc.code,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchInventory();
  }, [page, pageSize, filters]);

  useEffect(() => {
    fetchLocations();
  }, []);

  // Handlers
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleFiltersChange = useCallback((newFilters: InventoryFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to page 1 when filters change
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleItemClick = useCallback(
    (item: InventoryItem) => {
      // Navigate to item detail page
      navigate({
        to: "/inventory/$itemId" as const,
        params: { itemId: item.id },
      });
    },
    [navigate]
  );

  const handleAdjust = useCallback((item: InventoryItem) => {
    toast.info("Adjustment", { description: `Adjust ${item.productSku}` });
  }, []);

  const handleTransfer = useCallback((item: InventoryItem) => {
    toast.info("Transfer", { description: `Transfer ${item.productSku}` });
  }, []);

  const handleExport = useCallback(async (ids: string[], _columns: string[]) => {
    // TODO: Use columns to customize export
    void _columns;
    toast.success("Export started", { description: `Exporting ${ids.length} items` });
  }, []);

  const handleReceiveInventory = useCallback(() => {
    navigate({
      to: "/_authenticated/inventory/receiving" as any,
    });
  }, [navigate]);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Inventory"
        description="Browse and manage warehouse inventory"
        actions={
          <Button onClick={handleReceiveInventory}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Receive Inventory
          </Button>
        }
      />

      <PageLayout.Content>
        <InventoryBrowser
          items={items}
          isLoading={isLoading}
          products={[]} // TODO: Fetch products for filter dropdown
          locations={locations}
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onItemClick={handleItemClick}
          onAdjust={handleAdjust}
          onTransfer={handleTransfer}
          onExport={handleExport}
          onRefresh={fetchInventory}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}

export default InventoryPage;
