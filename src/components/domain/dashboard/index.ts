/**
 * Dashboard Domain Components
 *
 * Components specific to the dashboard route.
 */

export { WelcomeChecklist, onboardingKeys } from "./welcome-checklist"
export type { WelcomeChecklistProps, ChecklistItem } from "./welcome-checklist"

// Dashboard grid components
export { DashboardDndProvider } from "./dnd-provider"
export type { DashboardDndProviderProps } from "./dnd-provider"

export { DashboardGrid } from "./dashboard-grid"
export type { DashboardGridProps, WidgetConfig } from "./dashboard-grid"

export { WidgetCatalog } from "./widget-catalog"
export type { WidgetCatalogProps, WidgetDefinition } from "./widget-catalog"

// Main dashboard component
export { MainDashboard } from "./main-dashboard"
export type {
  MainDashboardProps,
  CustomerMetrics,
  PipelineMetrics,
  LowStockItem,
  OrderListItem,
} from "./main-dashboard"

// Chart controls
export { ChartControls } from "./chart-controls"
export type {
  ChartControlsProps,
  ComparisonPeriod,
  ExportFormat,
} from "./chart-controls"

// Drill-down modal
export { DrillDownModal } from "./drill-down-modal"
export type { DrillDownModalProps, DrillDownDataItem } from "./drill-down-modal"

// Dashboard context
export { DashboardProvider, useDashboardContext, useDashboardDateRange } from "./dashboard-context"
export type { DashboardContextValue, DashboardProviderProps } from "./dashboard-context"

// Date range selector
export { DateRangeSelector, ConnectedDateRangeSelector } from "./date-range-selector"
export type { DateRangeSelectorProps } from "./date-range-selector"

// Widgets
export * from './widgets'
