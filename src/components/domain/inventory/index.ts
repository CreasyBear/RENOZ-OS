/**
 * Inventory Domain Components
 *
 * Export all inventory-related components for use throughout the application.
 */

// Dashboard components
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
} from "./dashboard-widgets";

// Alerts components
export {
  AlertsPanel,
  type AlertType,
  type AlertSeverity,
  type InventoryAlert,
} from "./alerts-panel";

// Quick actions
export {
  QuickActionsBar,
  QuickActionsGrid,
} from "./quick-actions";

// Browser components
export {
  FilterPanel,
  type InventoryFilters,
  defaultInventoryFilters,
} from "./filter-panel";

export {
  ViewModeToggle,
  InventoryListView,
  InventoryGridView,
  InventoryMapView,
  type InventoryItem,
  type ViewMode,
} from "./view-modes";

export {
  InventoryBrowser,
} from "./inventory-browser";

// Item detail components
export {
  ItemDetail,
  type ItemDetailData,
} from "./item-detail";

export {
  ItemTabs,
  type MovementRecord,
  type CostLayer,
  type ForecastData,
  type QualityRecord,
} from "./item-tabs";

// Location management components
export {
  LocationTree,
  type LocationType,
  type WarehouseLocation,
} from "./location-tree";

export { LocationForm } from "./location-form";

export {
  LocationDetail,
  type LocationContents,
} from "./location-detail";

// Stock counting components
export {
  StockCountList,
  type CountStatus,
  type CountType,
  type StockCount,
} from "./stock-count-list";

export {
  CountSheet,
  type CountItem,
  type CountProgress,
} from "./count-sheet";

export { VarianceReport } from "./variance-report";

// Receiving components
export { ReceivingForm } from "./receiving-form";
export {
  ReceivingHistory,
  type ReceivingRecord,
} from "./receiving-history";

// Forecasting components
export {
  ReorderRecommendations,
  type ReorderUrgency,
  type ReorderRecommendation,
} from "./reorder-recommendations";

export {
  ForecastChart,
  type ForecastPeriod,
  type ForecastDataPoint,
  type ForecastAccuracy,
} from "./forecast-chart";

// Alerts management components
export { AlertConfigForm } from "./alert-config-form";
export {
  AlertsList,
  type AlertRule,
} from "./alerts-list";

// Analytics and reporting components
export {
  ValuationReport,
  type ValuationSummary,
  type CategoryValuation,
  type LocationValuation,
} from "./valuation-report";

export {
  AgingReport,
  type AgingSummary,
  type AgeBucket,
  type AgingItem,
} from "./aging-report";

export {
  TurnoverReport,
  type TurnoverSummary,
  type CategoryTurnover,
  type TurnoverTrend,
} from "./turnover-report";

export {
  MovementAnalytics,
  type MovementSummary,
  type MovementByType,
  type TopMover,
  type MovementTrend,
} from "./movement-analytics";
