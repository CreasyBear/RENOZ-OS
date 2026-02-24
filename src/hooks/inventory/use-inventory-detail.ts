/**
 * Inventory Detail Hook
 *
 * Custom hook that encapsulates all data fetching, state management, and actions
 * for the inventory detail view. Follows the hook pattern from DETAIL-VIEW-STANDARDS.md.
 *
 * NOTE: This hook provides item-tracking data for serialized inventory items.
 * Product-level concerns (forecasts, reorder points) are handled by the
 * Product Inventory View at /products/{productId}?tab=inventory.
 *
 * @source item from useInventoryItem hook
 * @source movements from useInventoryMovements hook
 * @source quality from useQualityInspections hook
 * @source activities from useUnifiedActivities hook
 * @source alerts from useInventoryItemAlerts hook (item-contextual only)
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Hook patterns
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  useInventoryItem,
  useInventoryMovements,
  useAdjustInventory,
  useTransferInventory,
} from './use-inventory';
import { useQualityInspections } from './use-quality';
import { useCostLayers } from './use-valuation';
import { useLocations } from './use-locations';
import { useInventoryItemAlerts } from './use-inventory-item-alerts';
import { useUnifiedActivities } from '@/hooks/activities';
import { useUpdateProduct } from '@/hooks/products';
import { toastSuccess, toastError } from '@/hooks';
import type { InventoryItemAlert } from '@/lib/schemas/inventory/item-alerts';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import type { UpdateProduct } from '@/lib/schemas/products';
import type { StockAdjustment, StockTransfer, HookWarehouseLocation } from '@/lib/schemas/inventory';

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryDetailActions {
  /** Open adjustment dialog */
  onAdjust: () => void;
  /** Open transfer dialog */
  onTransfer: () => void;
  /** Open edit dialog */
  onEdit: () => void;
  /** Copy page link to clipboard */
  onCopyLink: () => void;
  /** Print page */
  onPrint: () => void;
  /** Navigate back to inventory list */
  onBack: () => void;
}

export interface UseInventoryDetailReturn {
  // ─────────────────────────────────────────────────────────────────────────
  // Core Data
  // ─────────────────────────────────────────────────────────────────────────
  /** Full item data from API */
  itemData: Awaited<ReturnType<typeof useInventoryItem>>['data'];
  /** Item record */
  item: NonNullable<Awaited<ReturnType<typeof useInventoryItem>>['data']>['item'] | undefined;
  /** Movement history */
  movements: unknown[];
  /** Cost layers (FIFO) */
  costLayers: unknown[];
  /** Quality inspection records */
  qualityRecords: Array<{
    id: string;
    inspectionDate: Date;
    inspectorName: string | null;
    result: string;
    notes?: string;
    defects?: string[];
  }>;
  /** Activity timeline */
  activities: UnifiedActivity[];
  /** Item-specific alerts (item-contextual only) */
  alerts: InventoryItemAlert[];
  /** Available warehouse locations */
  locations: HookWarehouseLocation[];

  // ─────────────────────────────────────────────────────────────────────────
  // Loading States
  // ─────────────────────────────────────────────────────────────────────────
  isLoading: boolean;
  error: Error | null;
  movementsLoading: boolean;
  costLayersLoading: boolean;
  qualityLoading: boolean;
  activitiesLoading: boolean;
  activitiesError: Error | null;
  alertsLoading: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // UI State
  // ─────────────────────────────────────────────────────────────────────────
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSidebar: boolean;
  toggleSidebar: () => void;

  // ─────────────────────────────────────────────────────────────────────────
  // Dialog States
  // ─────────────────────────────────────────────────────────────────────────
  transferDialogOpen: boolean;
  setTransferDialogOpen: (open: boolean) => void;
  adjustDialogOpen: boolean;
  setAdjustDialogOpen: (open: boolean) => void;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;

  // ─────────────────────────────────────────────────────────────────────────
  // Mutation States
  // ─────────────────────────────────────────────────────────────────────────
  isTransferring: boolean;
  isAdjusting: boolean;
  isUpdatingProduct: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────
  actions: InventoryDetailActions;

  // ─────────────────────────────────────────────────────────────────────────
  // Mutation Handlers
  // ─────────────────────────────────────────────────────────────────────────
  handleAdjust: (data: StockAdjustment) => Promise<void>;
  handleTransfer: (data: StockTransfer) => Promise<void>;
  handleEditProduct: (data: UpdateProduct) => Promise<void>;
  // ─────────────────────────────────────────────────────────────────────────
  // Tab Counts
  // ─────────────────────────────────────────────────────────────────────────
  counts: {
    movements: number;
    costLayers: number;
    qualityRecords: number;
    activities: number;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Alerts Info
  // ─────────────────────────────────────────────────────────────────────────
  hasAlerts: boolean;
  criticalAlertCount: number;
  warningAlertCount: number;

  // ─────────────────────────────────────────────────────────────────────────
  // Disabled Reasons (for DisabledButtonWithTooltip)
  // ─────────────────────────────────────────────────────────────────────────
  transferDisabledReason: string | undefined;

  // ─────────────────────────────────────────────────────────────────────────
  // Refetch
  // ─────────────────────────────────────────────────────────────────────────
  refetch: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useInventoryDetail(inventoryId: string): UseInventoryDetailReturn {
  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────────────────────
  // UI State
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [showSidebar, setShowSidebar] = useState(true);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────
  const {
    data: itemData,
    isLoading,
    error,
    refetch,
  } = useInventoryItem(inventoryId);

  const item = itemData?.item;
  const productId = item?.productId;

  const {
    data: movementsData,
    isLoading: movementsLoading,
  } = useInventoryMovements(inventoryId);

  const {
    data: costLayersData,
    isLoading: costLayersLoading,
  } = useCostLayers({ inventoryId }, !!inventoryId);

  // NOTE: Forecasts removed from item view - product-level concern
  // See Product Inventory View at /products/{productId}?tab=inventory

  const {
    data: qualityData,
    isLoading: qualityLoading,
  } = useQualityInspections(inventoryId);

  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'inventory',
    entityId: inventoryId,
  });

  const { locations } = useLocations({
    autoFetch: true,
    initialFilters: { active: true },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Derived Alerts
  // ─────────────────────────────────────────────────────────────────────────
  const alertInput = useMemo(() => {
    if (!item) return null;
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product?.name,
      quantityOnHand: item.quantityOnHand ?? 0,
      quantityAvailable: item.quantityAvailable ?? 0,
      reorderPoint: item.product?.reorderPoint ?? 10,
      // Note: maxStockLevel and safetyStock don't exist on products table
      // These would need to come from forecasts or be removed from ItemDetailData type
      maxStockLevel: null, // Not available - would need to fetch from forecasts if needed
      safetyStock: null, // Not available - would need to fetch from forecasts if needed
      expiryDate: item.expiryDate,
      status: item.status,
      // Note: qualityStatus is not in inventory table schema (PRD mentions it but not implemented)
      // Derive from status field: damaged/quarantined statuses map to quality statuses
      // Expired would need expiryDate check (not implemented here)
      qualityStatus: item.status === 'damaged' 
        ? 'damaged' as const
        : item.status === 'quarantined'
        ? 'quarantined' as const
        : undefined,
    };
  }, [item]);

  const {
    alerts,
    hasAlerts,
    criticalCount: criticalAlertCount,
    warningCount: warningAlertCount,
  } = useInventoryItemAlerts(alertInput);

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const adjustMutation = useAdjustInventory();
  const transferMutation = useTransferInventory();
  const updateProductMutation = useUpdateProduct();

  // ─────────────────────────────────────────────────────────────────────────
  // Transform Data
  // ─────────────────────────────────────────────────────────────────────────
  const movements = useMemo(() => {
    // movementsData comes from useInventoryMovements which returns ListMovementsResult
    return movementsData?.movements ?? itemData?.movements ?? [];
  }, [movementsData, itemData]);

  const costLayers = useMemo(() => {
    // costLayersData comes from useCostLayers which returns { layers, summary }
    // itemData comes from getInventoryItem which returns { item, movements, costLayers }
    return costLayersData?.layers ?? itemData?.costLayers ?? [];
  }, [costLayersData, itemData]);

  const qualityRecords = useMemo(() => {
    if (!qualityData?.inspections) return [];
    return qualityData.inspections.map((q: { id: string; inspectionDate: string | Date; inspectorName: string | null; result: string; notes?: string | null; defects?: unknown }) => {
      const defects = Array.isArray(q.defects) && q.defects.every((d): d is string => typeof d === 'string')
        ? q.defects
        : undefined;
      return {
        id: q.id,
        inspectionDate: new Date(q.inspectionDate),
        inspectorName: q.inspectorName,
        result: q.result,
        notes: q.notes ?? undefined,
        defects,
      };
    });
  }, [qualityData]);

  // ─────────────────────────────────────────────────────────────────────────
  // Tab Counts
  // ─────────────────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    movements: movements.length,
    costLayers: costLayers.length,
    qualityRecords: qualityRecords.length,
    activities: activities?.length ?? 0,
  }), [movements.length, costLayers.length, qualityRecords.length, activities?.length]);

  // ─────────────────────────────────────────────────────────────────────────
  // Disabled Reasons
  // ─────────────────────────────────────────────────────────────────────────
  const transferDisabledReason = useMemo(() => {
    if (!item) return undefined;
    if ((item.quantityAvailable ?? 0) <= 0) {
      return 'Cannot transfer: no available quantity';
    }
    return undefined;
  }, [item]);

  // ─────────────────────────────────────────────────────────────────────────
  // Mutation Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleAdjust = useCallback(
    async (data: StockAdjustment) => {
      await adjustMutation.mutateAsync(data);
      await refetch();
      setAdjustDialogOpen(false);
    },
    [adjustMutation, refetch]
  );

  const handleTransfer = useCallback(
    async (data: StockTransfer) => {
      await transferMutation.mutateAsync(data);
      setTransferDialogOpen(false);
      // Navigate back since the item may be depleted
      navigate({ to: '/inventory' });
    },
    [transferMutation, navigate]
  );

  const handleEditProduct = useCallback(
    async (data: UpdateProduct) => {
      if (!productId) {
        throw new Error('Product ID not found');
      }
      try {
        await updateProductMutation.mutateAsync({
          id: productId,
          data,
        });
        toastSuccess('Product updated successfully');
        await refetch();
        setEditDialogOpen(false);
      } catch {
        toastError('Failed to update product');
        throw new Error('Update failed');
      }
    },
    [productId, updateProductMutation, refetch]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Actions (memoized)
  // ─────────────────────────────────────────────────────────────────────────
  const actions = useMemo<InventoryDetailActions>(
    () => ({
      onAdjust: () => setAdjustDialogOpen(true),
      onTransfer: () => setTransferDialogOpen(true),
      onEdit: () => setEditDialogOpen(true),
      onCopyLink: () => {
        navigator.clipboard.writeText(window.location.href);
        toastSuccess('Link copied to clipboard');
      },
      onPrint: () => {
        window.print();
      },
      onBack: () => {
        navigate({ to: '/inventory' });
      },
    }),
    [navigate]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Sidebar Toggle
  // ─────────────────────────────────────────────────────────────────────────
  const toggleSidebar = useCallback(() => {
    setShowSidebar((prev) => !prev);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // Data
    itemData,
    item,
    movements,
    costLayers,
    qualityRecords,
    activities: activities ?? [],
    alerts,
    locations,

    // Loading states
    isLoading,
    error: error ?? null,
    movementsLoading,
    costLayersLoading,
    qualityLoading,
    activitiesLoading,
    activitiesError: activitiesError ?? null,
    alertsLoading: false, // Alerts are derived synchronously

    // UI State
    activeTab,
    onTabChange: setActiveTab,
    showSidebar,
    toggleSidebar,

    // Dialog states
    transferDialogOpen,
    setTransferDialogOpen,
    adjustDialogOpen,
    setAdjustDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    // Mutation states
    isTransferring: transferMutation.isPending,
    isAdjusting: adjustMutation.isPending,
    isUpdatingProduct: updateProductMutation.isPending,

    // Actions
    actions,

    // Mutation handlers
    handleAdjust,
    handleTransfer,
    handleEditProduct,

    // Tab counts
    counts,

    // Alerts info
    hasAlerts,
    criticalAlertCount,
    warningAlertCount,

    // Disabled reasons
    transferDisabledReason,

    // Refetch
    refetch,
  };
}

export default useInventoryDetail;
