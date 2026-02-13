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
  useInventorySearch,
  useMovements,
  useMovementsDashboard,
  useAdjustInventory,
  useTransferInventory,
  useReceiveInventory,
  useInventoryDashboard,
  useLocationUtilization,
} from './use-inventory';

// Serial number management
export {
  useAvailableSerials,
  type UseAvailableSerialsOptions,
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

// Quality
export {
  useQualityInspections,
  useCreateQualityInspection,
} from './use-quality';

// Detail View (composite hook)
export { useInventoryDetail, type UseInventoryDetailReturn, type InventoryDetailActions } from './use-inventory-detail';

// Availability check
export {
  useInventoryAvailability,
  useCheckInventoryAvailability,
  usePrefetchInventoryAvailability,
  type AvailabilityCheck,
  type UseInventoryAvailabilityOptions,
} from './use-inventory-availability';

// Item-specific alerts (derived from item state)
export {
  useInventoryItemAlerts,
  deriveItemAlerts,
  type UseInventoryItemAlertsOptions,
  type UseInventoryItemAlertsReturn,
} from './use-inventory-item-alerts';

// WMS Dashboard
export {
  useWMSDashboard,
  useStockByCategory,
  useStockByLocation,
  useRecentMovementsTimeline,
} from './use-wms-dashboard';

// Re-export types
export type { InventoryItem, InventoryFilters, MovementRecord } from '@/lib/schemas/inventory';
export type { WarehouseLocation, LocationType, LocationFilters } from './use-locations';
export type { AlertFilters, UseAlertsOptions } from './use-alerts';
export type { ForecastFilters, UseForecastsOptions, ReorderFilters } from './use-forecasting';
export type { CostLayerFilters, ValuationFilters, AgingFilters, TurnoverFilters } from './use-valuation';
export type { StockCountFilters, UseStockCountsOptions } from './use-stock-counts';
export type {
  CategoryStock,
  LocationStock,
  RecentMovement,
  WMSDashboardData,
} from './use-wms-dashboard';
