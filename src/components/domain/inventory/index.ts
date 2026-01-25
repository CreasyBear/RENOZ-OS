/**
 * Inventory Domain Components
 *
 * Export all inventory-related components for use throughout the application.
 */

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

export {
  FilterPanel,
  type InventoryFilters,
  defaultInventoryFilters,
} from './filter-panel';

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
export type { MovementByType, MovementTrend } from './reports/movement-analytics';
