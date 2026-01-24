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

// Target progress
export { TargetProgressWidget } from "./target-progress"
export type { TargetProgressProps } from "./target-progress"

// Comparison components
export { ComparisonToggle } from './comparison-toggle'
export type { ComparisonToggleProps } from './comparison-toggle'

export {
  ChangeIndicator,
  TrendIndicator,
  SignificanceIndicator,
  MetricComparisonIndicator,
} from './comparison-indicators'
export type {
  ChangeIndicatorProps,
  TrendIndicatorProps,
  SignificanceIndicatorProps,
  MetricComparisonIndicatorProps,
} from './comparison-indicators'

export { ComparisonChart, toChartDataPoints } from './comparison-chart'
export type { ComparisonChartProps, ComparisonDataPoint } from './comparison-chart'

// Widgets
export * from './widgets'
