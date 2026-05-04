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
import { useNavigate } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useProductInventory,
  useProductInventoryStats,
  useProductCostLayers,
  useLowStockAlerts,
} from "@/hooks/products";
import { usePriceLists } from "@/hooks/suppliers";
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
  const navigate = useNavigate();
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();

  // Fetch inventory data
  const {
    data: inventorySummary,
    isLoading: inventoryLoading,
    error: inventoryError,
    refetch: refetchInventory,
  } = useProductInventory({
    productId,
    enabled: trackInventory,
  });

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useProductInventoryStats({
    productId,
    enabled: trackInventory,
  });

  const { data: lowStockAlerts, error: lowStockError } = useLowStockAlerts({
    enabled: trackInventory,
  });

  const { data: costLayersData, error: costLayersError } = useProductCostLayers({
    productId,
    enabled: trackInventory,
  });
  const { data: preferredSupplierPrices } = usePriceLists({
    productId,
    status: "active",
    isPreferred: true,
    page: 1,
    pageSize: 1,
    enabled: trackInventory,
  });

  const isLoading = inventoryLoading || statsLoading;
  const isLowStock = lowStockAlerts?.some((alert) => alert.productId === productId) ?? false;
  const preferredSupplierId = preferredSupplierPrices?.items?.[0]?.supplierId;
  const inventoryUnavailableMessage =
    inventoryError instanceof Error && !inventorySummary
      ? 'Product inventory is temporarily unavailable. Please refresh and try again.'
      : null;
  const inventoryWarningMessage =
    inventoryError instanceof Error && inventorySummary
      ? 'Showing the most recent product inventory while refresh is unavailable.'
      : statsError instanceof Error
        ? 'Inventory statistics are temporarily unavailable right now.'
        : null;
  const secondaryWarningMessage =
    costLayersError instanceof Error
      ? 'Cost layers are temporarily unavailable right now.'
      : lowStockError instanceof Error
        ? 'Low stock alerts are temporarily unavailable right now.'
        : null;

  // Refresh handler for after adjustments
  const handleRefresh = useCallback(() => {
    refetchInventory();
  }, [refetchInventory]);

  const handleOpenAdjustment = useCallback((locationId?: string) => {
    setSelectedLocationId(locationId);
    setShowAdjustment(true);
  }, []);

  const handleOpenReceiveInventory = useCallback(() => {
    navigate({
      to: "/inventory/receiving",
      search: {
        productId,
        source: "product_detail",
        returnToProductId: productId,
      },
    });
  }, [navigate, productId]);

  const handleOrderStock = useCallback(() => {
    navigate({
      to: "/purchase-orders/create",
      search: {
        productId,
        source: "product_detail",
        returnToProductId: productId,
        ...(preferredSupplierId ? { supplierId: preferredSupplierId } : {}),
      },
    });
  }, [navigate, preferredSupplierId, productId]);

  if (inventoryUnavailableMessage) {
    return (
      <Alert>
        <AlertTitle>Inventory unavailable</AlertTitle>
        <AlertDescription>{inventoryUnavailableMessage}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {inventoryWarningMessage ? (
        <Alert>
          <AlertTitle>Inventory partially unavailable</AlertTitle>
          <AlertDescription>{inventoryWarningMessage}</AlertDescription>
        </Alert>
      ) : null}
      {secondaryWarningMessage ? (
        <Alert>
          <AlertTitle>Inventory secondary data unavailable</AlertTitle>
          <AlertDescription>{secondaryWarningMessage}</AlertDescription>
        </Alert>
      ) : null}
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
        onOpenReceiveInventory={handleOpenReceiveInventory}
        onOpenAdjustment={handleOpenAdjustment}
        onOrderStock={handleOrderStock}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
