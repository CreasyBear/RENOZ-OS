/**
 * Analytics Domain Components
 *
 * Barrel export for procurement analytics and reporting UI components.
 * SUPP-ANALYTICS-REPORTING story.
 */

export {
  SpendAnalysis,
  SpendBySupplierTable,
  SpendByCategoryTable,
  SpendTrends,
} from './spend-analysis';
export type { SpendAnalysisProps } from './spend-analysis';

export {
  SupplierPerformance,
  SupplierRankings,
  PerformanceTable,
  AggregateMetrics,
} from './supplier-performance';
export type { SupplierPerformanceProps } from './supplier-performance';

export {
  ProcurementMetrics,
  KPICards,
  OrderAnalyticsCard,
  CostSavingsCard,
} from './procurement-metrics';
export type { ProcurementMetricsProps } from './procurement-metrics';
