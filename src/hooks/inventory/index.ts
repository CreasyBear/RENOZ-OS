/**
 * Inventory Hooks
 *
 * Provides hooks for inventory management, stock tracking, and warehouse locations.
 */

// Main inventory management
export {
  useInventory,
  useInventoryItem,
  useInventoryMovements,
  useInventoryLowStock,
  useMovements,
  useMovementsDashboard,
  useAdjustInventory,
  useTransferInventory,
  useReceiveInventory,
  useInventoryDashboard,
  useLocationUtilization,
} from './use-inventory';

// Location management
export {
  useLocations,
  useLocationHierarchy,
  useLocationDetail,
  useCreateWarehouseLocation,
  useUpdateWarehouseLocation,
  useDeleteWarehouseLocation,
} from './use-locations';

// Alert management
export {
  useAlerts,
  useAlert,
  useTriggeredAlerts,
  useAlertAnalytics,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useAcknowledgeAlert,
  useToggleAlertActive,
} from './use-alerts';

// Forecasting
export {
  useForecasts,
  useProductForecast,
  useReorderRecommendations,
  useForecastAccuracy,
  useSafetyStock,
  useUpsertForecast,
  useBulkUpdateForecasts,
} from './use-forecasting';

// Valuation
export {
  useCostLayers,
  useInventoryCostLayers,
  useInventoryValuation,
  useCOGSPreview,
  useInventoryAging,
  useInventoryTurnover,
  useCreateCostLayer,
  useCalculateCOGS,
} from './use-valuation';

// Stock counts
export {
  useStockCounts,
  useStockCount,
  useStockCountItems,
  useCountVarianceAnalysis,
  useCountHistory,
  useCreateStockCount,
  useUpdateStockCount,
  useStartStockCount,
  useUpdateStockCountItem,
  useBulkUpdateCountItems,
  useCompleteStockCount,
  useCancelStockCount,
} from './use-stock-counts';

// Re-export types
export type { InventoryItem, InventoryFilters, MovementRecord } from '@/lib/schemas/inventory';
export type { WarehouseLocation, LocationType, LocationFilters } from './use-locations';
export type { AlertFilters, UseAlertsOptions } from './use-alerts';
export type { ForecastFilters, UseForecastsOptions, ReorderFilters } from './use-forecasting';
export type { CostLayerFilters, ValuationFilters, AgingFilters, TurnoverFilters } from './use-valuation';
export type { StockCountFilters, UseStockCountsOptions } from './use-stock-counts';
