/**
 * Dashboard Domain Components
 *
 * Components specific to the dashboard route.
 */

// --- Core Components ---
export { WelcomeChecklistContainer } from "./welcome-checklist-container"
export type { WelcomeChecklistContainerProps } from "./welcome-checklist-container"
export { WelcomeChecklistPresenter, WelcomeChecklist } from "./welcome-checklist"
export type { WelcomeChecklistProps, ChecklistItem } from "./welcome-checklist"

export { DashboardDndProvider } from "./dnd-provider"
export type { DashboardDndProviderProps } from "./dnd-provider"

export { DashboardGrid } from "./dashboard-grid"
export type { DashboardGridProps, WidgetConfig } from "./dashboard-grid"

export { WidgetCatalog } from "./widget-catalog"
export type { WidgetCatalogProps, WidgetDefinition } from "./widget-catalog"

export { WidgetRenderer, type WidgetRendererProps } from "./widget-renderer"

export { MainDashboard } from "./main-dashboard"
export type {
  MainDashboardProps,
  CustomerMetrics,
  PipelineMetrics,
  LowStockItem,
  OrderListItem,
} from "./main-dashboard"

export { ChartControls } from "./chart-controls"
export type {
  ChartControlsProps,
  ComparisonPeriod,
  ExportFormat,
} from "./chart-controls"

export { DrillDownModal } from "./drill-down-modal"
export type { DrillDownModalProps, DrillDownDataItem } from "./drill-down-modal"

export { DashboardProvider, useDashboardContext, useDashboardDateRange } from "./dashboard-context"
export type { DashboardContextValue, DashboardProviderProps } from "./dashboard-context"

export { DateRangeSelector, ConnectedDateRangeSelector } from "./date-range-selector"
export type { DateRangeSelectorProps } from "./date-range-selector"

export { TargetProgressWidget } from "./target-progress"
export type { TargetProgressProps } from "./target-progress"

// --- Comparison ---
export * from './comparison'

// --- Mobile ---
export * from './mobile'

// --- Widgets ---
export * from './widgets'

// --- Business Overview (comprehensive metrics) ---
export * from './business-overview'

// --- Overview Dashboard (Square UI inspired) ---
export * from './overview'
