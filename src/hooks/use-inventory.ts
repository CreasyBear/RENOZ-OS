/**
 * Inventory Hook
 *
 * Composable hook for inventory operations throughout the application.
 *
 * Features:
 * - Inventory CRUD operations
 * - Stock adjustments and transfers
 * - Receiving operations
 * - Movement history
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */
import { useState, useCallback, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import {
  listInventory,
  getInventoryItem,
  adjustInventory,
  transferInventory,
  receiveInventory,
  listMovements,
} from "@/server/functions/inventory";

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  locationId: string;
  locationName: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  reorderPoint: number;
  safetyStock: number;
  unitCost: number;
  totalValue: number;
  lastMovementAt: Date | null;
  status: "in_stock" | "low_stock" | "out_of_stock" | "overstocked";
}

export interface MovementRecord {
  id: string;
  inventoryId: string;
  movementType: "receive" | "issue" | "transfer" | "adjustment" | "return";
  quantity: number;
  unitCost: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  notes?: string;
  performedBy: string;
  createdAt: Date;
}

export interface InventoryFilters {
  search?: string;
  productId?: string;
  locationId?: string;
  status?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
}

interface UseInventoryOptions {
  initialFilters?: InventoryFilters;
  autoFetch?: boolean;
}

interface UseInventoryResult {
  // Data
  items: InventoryItem[];
  total: number;
  currentItem: InventoryItem | null;
  movements: MovementRecord[];

  // State
  isLoading: boolean;
  isLoadingItem: boolean;
  isSubmitting: boolean;

  // Actions
  fetchInventory: (filters?: InventoryFilters) => Promise<void>;
  fetchItem: (inventoryId: string) => Promise<InventoryItem | null>;
  fetchMovements: (inventoryId: string) => Promise<MovementRecord[]>;
  adjustStock: (
    inventoryId: string,
    quantity: number,
    reason: string,
    notes?: string
  ) => Promise<boolean>;
  transferStock: (
    inventoryId: string,
    quantity: number,
    toLocationId: string,
    notes?: string
  ) => Promise<boolean>;
  receiveStock: (data: {
    productId: string;
    quantity: number;
    unitCost: number;
    locationId?: string;
    serialNumber?: string;
    batchNumber?: string;
    expiryDate?: Date;
    referenceId?: string;
    referenceType?: string;
  }) => Promise<boolean>;

  // Filters
  filters: InventoryFilters;
  setFilters: (filters: InventoryFilters) => void;
  resetFilters: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

const DEFAULT_FILTERS: InventoryFilters = {
  page: 1,
  pageSize: 50,
};

export function useInventory(options: UseInventoryOptions = {}): UseInventoryResult {
  const { initialFilters = DEFAULT_FILTERS } = options;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [filters, setFilters] = useState<InventoryFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch inventory list
  const fetchInventory = useCallback(async (newFilters?: InventoryFilters) => {
    try {
      setIsLoading(true);
      const activeFilters = newFilters ?? filters;
      if (newFilters) {
        setFilters(newFilters);
      }

      const data = (await listInventory({
        data: {
          page: activeFilters.page ?? 1,
          pageSize: activeFilters.pageSize ?? 50,
          ...(activeFilters.search && { search: activeFilters.search }),
          ...(activeFilters.productId && { productId: activeFilters.productId }),
          ...(activeFilters.locationId && { locationId: activeFilters.locationId }),
          ...(activeFilters.lowStock !== undefined && { lowStock: activeFilters.lowStock }),
        },
      })) as any;

      if (data?.items) {
        setItems(
          data.items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            productName: item.product?.name ?? "Unknown",
            productSku: item.product?.sku ?? "",
            locationId: item.locationId,
            locationName: item.location?.name ?? "Unknown",
            quantityOnHand: item.quantityOnHand ?? 0,
            quantityAllocated: item.quantityAllocated ?? 0,
            quantityAvailable: item.quantityAvailable ?? 0,
            reorderPoint: item.reorderPoint ?? 0,
            safetyStock: item.safetyStock ?? 0,
            unitCost: Number(item.unitCost ?? 0),
            totalValue: Number(item.totalValue ?? 0),
            lastMovementAt: item.lastMovementAt ? new Date(item.lastMovementAt) : null,
            status: getStockStatus(item),
          }))
        );
        setTotal(data.pagination?.total ?? data.items.length);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Fetch single item
  const fetchItem = useCallback(async (inventoryId: string): Promise<InventoryItem | null> => {
    try {
      setIsLoadingItem(true);
      const data = (await getInventoryItem({
        data: { id: inventoryId },
      })) as any;

      if (data?.item) {
        const item: InventoryItem = {
          id: data.item.id,
          productId: data.item.productId,
          productName: data.item.product?.name ?? "Unknown",
          productSku: data.item.product?.sku ?? "",
          locationId: data.item.locationId,
          locationName: data.item.location?.name ?? "Unknown",
          quantityOnHand: data.item.quantityOnHand ?? 0,
          quantityAllocated: data.item.quantityAllocated ?? 0,
          quantityAvailable: data.item.quantityAvailable ?? 0,
          reorderPoint: data.item.reorderPoint ?? 0,
          safetyStock: data.item.safetyStock ?? 0,
          unitCost: Number(data.item.unitCost ?? 0),
          totalValue: Number(data.item.totalValue ?? 0),
          lastMovementAt: data.item.lastMovementAt
            ? new Date(data.item.lastMovementAt)
            : null,
          status: getStockStatus(data.item),
        };
        setCurrentItem(item);
        return item;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch inventory item:", error);
      toast.error("Failed to load inventory item");
      return null;
    } finally {
      setIsLoadingItem(false);
    }
  }, []);

  // Fetch movements for item
  const fetchMovements = useCallback(
    async (inventoryId: string): Promise<MovementRecord[]> => {
      try {
        const data = (await listMovements({
          data: {
            productId: inventoryId, // Use productId filter
            page: 1,
            pageSize: 100,
          },
        })) as any;

        if (data?.movements) {
          const records = data.movements.map((m: any) => ({
            id: m.id,
            inventoryId: m.inventoryId,
            movementType: m.movementType ?? "adjustment",
            quantity: m.quantity ?? 0,
            unitCost: Number(m.unitCost ?? 0),
            previousQuantity: m.previousQuantity ?? 0,
            newQuantity: m.newQuantity ?? 0,
            referenceType: m.referenceType,
            referenceId: m.referenceId,
            reason: m.reason,
            notes: m.notes,
            performedBy: m.performedBy ?? m.userId ?? "System",
            createdAt: new Date(m.createdAt ?? Date.now()),
          }));
          setMovements(records);
          return records;
        }
        return [];
      } catch (error) {
        console.error("Failed to fetch movements:", error);
        return [];
      }
    },
    []
  );

  // Adjust stock
  const adjustStock = useCallback(
    async (
      inventoryId: string,
      quantity: number,
      reason: string,
      notes?: string
    ): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        // Get current item to get productId and locationId
        const item = currentItem ?? (await fetchItem(inventoryId));
        if (!item) {
          toast.error("Could not find inventory item");
          return false;
        }
        await adjustInventory({
          data: {
            productId: item.productId,
            locationId: item.locationId,
            adjustmentQty: quantity,
            reason,
            ...(notes && { notes }),
          },
        });

        toast.success("Stock adjusted", {
          description: `${quantity > 0 ? "+" : ""}${quantity} units`,
        });

        // Refresh the item
        await fetchItem(inventoryId);
        return true;
      } catch (error: any) {
        console.error("Failed to adjust stock:", error);
        toast.error(error.message ?? "Failed to adjust stock");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchItem]
  );

  // Transfer stock
  const transferStock = useCallback(
    async (
      inventoryId: string,
      quantity: number,
      toLocationId: string,
      notes?: string
    ): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        // Get current item to get productId and fromLocationId
        const item = currentItem ?? (await fetchItem(inventoryId));
        if (!item) {
          toast.error("Could not find inventory item");
          return false;
        }
        await transferInventory({
          data: {
            productId: item.productId,
            fromLocationId: item.locationId,
            toLocationId,
            quantity,
            ...(notes && { notes }),
          },
        });

        toast.success("Stock transferred", {
          description: `${quantity} units moved`,
        });

        // Refresh inventory list
        await fetchInventory();
        return true;
      } catch (error: any) {
        console.error("Failed to transfer stock:", error);
        toast.error(error.message ?? "Failed to transfer stock");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchInventory]
  );

  // Receive stock
  const receiveStock = useCallback(
    async (data: {
      productId: string;
      quantity: number;
      unitCost: number;
      locationId?: string;
      serialNumber?: string;
      batchNumber?: string;
      expiryDate?: Date;
      referenceId?: string;
      referenceType?: string;
    }): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        await receiveInventory({
          data: {
            productId: data.productId,
            quantity: data.quantity,
            unitCost: data.unitCost,
            locationId: data.locationId ?? "", // Required field
            ...(data.serialNumber && { serialNumber: data.serialNumber }),
            ...(data.batchNumber && { batchNumber: data.batchNumber }),
            ...(data.expiryDate && { expiryDate: data.expiryDate.toISOString().split("T")[0] }),
            ...(data.referenceId && { referenceId: data.referenceId }),
            ...(data.referenceType && { referenceType: data.referenceType }),
          },
        });

        toast.success("Inventory received", {
          description: `${data.quantity} units at $${data.unitCost.toFixed(2)} each`,
        });

        // Refresh inventory list
        await fetchInventory();
        return true;
      } catch (error: any) {
        console.error("Failed to receive inventory:", error);
        toast.error(error.message ?? "Failed to receive inventory");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchInventory]
  );

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return useMemo(
    () => ({
      items,
      total,
      currentItem,
      movements,
      isLoading,
      isLoadingItem,
      isSubmitting,
      fetchInventory,
      fetchItem,
      fetchMovements,
      adjustStock,
      transferStock,
      receiveStock,
      filters,
      setFilters,
      resetFilters,
    }),
    [
      items,
      total,
      currentItem,
      movements,
      isLoading,
      isLoadingItem,
      isSubmitting,
      fetchInventory,
      fetchItem,
      fetchMovements,
      adjustStock,
      transferStock,
      receiveStock,
      filters,
      resetFilters,
    ]
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getStockStatus(
  item: any
): "in_stock" | "low_stock" | "out_of_stock" | "overstocked" {
  const qty = item.quantityOnHand ?? item.quantityAvailable ?? 0;
  const reorder = item.reorderPoint ?? 0;
  const maxStock = item.maxStock ?? Infinity;

  if (qty <= 0) return "out_of_stock";
  if (qty <= reorder) return "low_stock";
  if (maxStock !== Infinity && qty > maxStock) return "overstocked";
  return "in_stock";
}

export default useInventory;
