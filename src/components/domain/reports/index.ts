/**
 * Reports Domain Components
 *
 * Report pages, charts, and analysis components.
 */

// Pages
export { ReportsIndexPage } from './reports-index-page'
export { CustomerReportsPage } from './customer-reports-page'
export { WarrantyAnalyticsPage } from './warranty-analytics-page'
export { PipelineForecastPage } from './pipeline-forecast-page'
export { JobCostingReportPage } from './job-costing-report-page'
export { ExpiringWarrantiesReportPage } from './expiring-warranties-page'
export { ProcurementReportsPage } from './procurement-reports-page'

// Forecasting
export { ForecastChart, type ForecastChartProps } from './forecast-chart'
export { ForecastTable, type ForecastTableProps } from './forecast-table'

// Win/Loss
export { WinLossAnalysis, type WinLossAnalysisProps } from './win-loss-analysis'

// Procurement
export {
  ProcurementReports,
  type ProcurementReportsProps,
  type ProcurementAnalytics,
} from './procurement-reports'
