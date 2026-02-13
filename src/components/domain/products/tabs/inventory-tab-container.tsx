/**
 * ProductInventoryTab Container
 *
 * Handles data fetching for inventory tab.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @source inventorySummary from useProductInventory hook
 * @source stats from useProductInventoryStats hook
 * @source lowStockAlerts from useLowStockAlerts hook
 * @source costLayersData from useProductCostLayers hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState, useCallback } from "react";
import {
  useProductInventory,
  useProductInventoryStats,
  useProductCostLayers,
  useLowStockAlerts,
} from "@/hooks/products";
import { ProductInventoryTabView } from "./inventory-tab-view";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductInventoryTabContainerProps {
  productId: string;
  trackInventory: boolean;
  isSerialized: boolean;
}

// ============================================================================
// CONTAINER
// ============================================================================

export function ProductInventoryTabContainer({
  productId,
  trackInventory,
  isSerialized,
}: ProductInventoryTabContainerProps) {
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();

  // Fetch inventory data
  const {
    data: inventorySummary,
    isLoading: inventoryLoading,
    refetch: refetchInventory,
  } = useProductInventory({
    productId,
    enabled: trackInventory,
  });

  const { data: stats, isLoading: statsLoading } = useProductInventoryStats({
    productId,
    enabled: trackInventory,
  });

  const { data: lowStockAlerts } = useLowStockAlerts({
    enabled: trackInventory,
  });

  const { data: costLayersData } = useProductCostLayers({
    productId,
    enabled: trackInventory,
  });

  const isLoading = inventoryLoading || statsLoading;
  const isLowStock = lowStockAlerts?.some((alert) => alert.productId === productId) ?? false;

  // Refresh handler for after adjustments
  const handleRefresh = useCallback(() => {
    refetchInventory();
  }, [refetchInventory]);

  // Handle add stock at specific location
  const handleAddStock = useCallback((locationId?: string) => {
    setSelectedLocationId(locationId);
    setShowAdjustment(true);
  }, []);

  return (
    <ProductInventoryTabView
      productId={productId}
      trackInventory={trackInventory}
      isSerialized={isSerialized}
      inventorySummary={inventorySummary}
      stats={stats}
      lowStockAlerts={lowStockAlerts}
      isLowStock={isLowStock}
      costLayersData={costLayersData}
      isLoading={isLoading}
      showAdjustment={showAdjustment}
      selectedLocationId={selectedLocationId}
      onShowAdjustmentChange={setShowAdjustment}
      onAddStock={handleAddStock}
      onRefresh={handleRefresh}
    />
  );
}
