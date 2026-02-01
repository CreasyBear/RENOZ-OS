/**
 * Reports Domain Components
 *
 * Report pages, charts, and analysis components.
 * Follows Container/Presenter pattern for data fetching separation.
 */

// ============================================================================
// REPORT PAGES
// ============================================================================
export { ReportsIndexPage } from './reports-index-page';
export { CustomerReportsPage } from './customer-reports-page';
export { WarrantyAnalyticsPage } from './warranty-analytics-page';
export {
  WarrantyAnalyticsView,
  type WarrantyAnalyticsViewProps,
  type SearchParams,
  type FilterOption,
  type AnalyticsFilterBadge,
} from './warranty-analytics-view';
export { PipelineForecastPage } from './pipeline-forecast-page';
export { JobCostingReportPage } from './job-costing-report-page';
export { ExpiringWarrantiesReportPage } from './expiring-warranties-page';
export { ProcurementReportsPage } from './procurement-reports-page';

// ============================================================================
// FORECASTING COMPONENTS
// ============================================================================
export { ForecastChart, type ForecastChartProps } from './forecast-chart';
export { ForecastTable, type ForecastTableProps } from './forecast-table';

// ============================================================================
// WIN/LOSS ANALYSIS
// ============================================================================
export { WinLossAnalysis, type WinLossAnalysisProps, type WinLossAnalysisPresenterProps } from './win-loss-analysis';
export { WinLossAnalysisContainer } from './win-loss-analysis-container';

// ============================================================================
// PROCUREMENT REPORTS
// ============================================================================
export {
  ProcurementReports,
  type ProcurementReportsProps,
  type ProcurementAnalytics,
} from './procurement-reports';
