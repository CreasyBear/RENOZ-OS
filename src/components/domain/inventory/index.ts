/**
 * Inventory Domain Components
 *
 * Export all inventory-related components for use throughout the application.
 */

// --- Containers (Data Fetching + State Management) ---
export {
  InventoryDetailContainer,
  type InventoryDetailContainerProps,
  type InventoryDetailContainerRenderProps,
} from './containers/inventory-detail-container';

// --- Views (Presenters - Pure UI) ---
export {
  InventoryDetailView,
  type InventoryDetailViewProps,
  type LocationStock,
  type SupplierInfo,
} from './views/inventory-detail-view';

// --- Status Configs ---
export {
  INVENTORY_STATUS_CONFIG,
  QUALITY_STATUS_CONFIG,
  MOVEMENT_TYPE_CONFIG,
  ALERT_SEVERITY_CONFIG,
  ALERT_ACTIVE_STATUS_CONFIG,
  FORECAST_ACCURACY_CONFIG,
  STOCK_STATUS_CONFIG,
  ALERT_TYPE_DISPLAY_CONFIG,
  getForecastAccuracyLevel,
} from './inventory-status-config';

// --- Core Components ---
export {
  MetricCard,
  StockOverviewWidget,
  RecentMovementsWidget,
  TopMoversWidget,
  LocationUtilizationWidget,
  type InventoryMetrics,
  type MovementSummary,
  type TopMover,
  type LocationUtilization,
} from './dashboard-widgets';

export { QuickActionsBar, QuickActionsGrid } from './quick-actions';

// --- Filter Config (FILTER-STANDARDS compliant) ---
export {
  INVENTORY_FILTER_CONFIG,
  INVENTORY_STATUS_OPTIONS,
  QUALITY_STATUS_OPTIONS,
  AGE_RANGE_OPTIONS,
  DEFAULT_INVENTORY_FILTERS,
  createInventoryFilterConfig,
  type InventoryFiltersState,
  type InventoryStatus,
  type QualityStatus,
  type AgeRange,
} from './inventory-filter-config';

export {
  ViewModeToggle,
  InventoryListView,
  InventoryGridView,
  InventoryMapView,
  type InventoryItem,
  type ViewMode,
} from './view-modes';

export { InventoryBrowser } from './inventory-browser';

export { ItemDetail, type ItemDetailData } from './item-detail';

export {
  ItemTabs,
  type MovementRecord,
  type CostLayer,
  type ForecastData,
  type QualityRecord,
} from './item-tabs';

export { AllocationsTab } from './allocations-tab';

// --- Dialogs ---
export {
  StockTransferDialog,
  type TransferFormData,
} from './stock-transfer-dialog';
export {
  StockAdjustmentDialog,
  type AdjustmentFormData,
} from './stock-adjustment-dialog';
export {
  InventoryItemEditDialog,
  type InventoryItemEditDialogProps,
} from './inventory-item-edit-dialog';

// --- Alerts ---
export * from './alerts';
export type { AlertType, AlertSeverity, InventoryAlert } from './alerts/alerts-panel';
export type { AlertRule } from './alerts/alerts-list';

// --- Counts ---
export * from './counts';
export type { CountStatus, CountType, StockCount } from './counts/stock-count-list';
export type { CountItem, CountProgress } from './counts/count-sheet';

// --- Forecasting ---
export * from './forecasting';
export type { ReorderUrgency, ReorderRecommendation } from './forecasting/reorder-recommendations';
export type { ForecastPeriod, ForecastDataPoint, ForecastAccuracy } from './forecasting/forecast-chart';

// --- Locations ---
export * from './locations';
export type { LocationType, WarehouseLocation } from './locations/location-tree';
export type { LocationContents } from './locations/location-detail';

// --- Receiving ---
export * from './receiving';
export type { ReceivingRecord } from './receiving/receiving-history';

// --- Reports ---
export * from './reports';
export type { ValuationSummary, CategoryValuation, LocationValuation } from './reports/valuation-report';
export type { AgingSummary, AgeBucket, AgingItem } from './reports/aging-report';
export type { TurnoverSummary, CategoryTurnover, TurnoverTrend } from './reports/turnover-report';
export type {
  MovementSummary as ReportMovementSummary,
  MovementByType,
  TopMover as ReportTopMover,
  MovementTrend,
  MovementType,
} from './reports/movement-analytics';
