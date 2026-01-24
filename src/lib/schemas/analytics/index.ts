/**
 * Analytics Schemas
 *
 * Zod schemas for procurement analytics and reporting UI.
 *
 * @see SUPP-ANALYTICS-REPORTING story
 */

import { z } from 'zod';

// ============================================================================
// TIME PERIOD
// ============================================================================

export const timePeriods = ['week', 'month', 'quarter', 'year', 'custom'] as const;
export type TimePeriod = (typeof timePeriods)[number];

export const TimePeriodSchema = z.enum(timePeriods);

export const AnalyticsDateRangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export type AnalyticsDateRange = z.infer<typeof AnalyticsDateRangeSchema>;

// ============================================================================
// SPEND ANALYSIS
// ============================================================================

export interface SpendBySupplier {
  supplierId: string;
  supplierName: string;
  totalSpend: number;
  orderCount: number;
  percentOfTotal: number;
}

export interface SpendByCategory {
  category: string;
  totalSpend: number;
  orderCount: number;
  percentOfTotal: number;
}

export interface SpendTrend {
  period: string;
  spend: number;
  budget: number;
  variance: number;
}

export interface SpendAnalysisData {
  totalSpend: number;
  budgetTotal: number;
  budgetUsed: number;
  spendBySupplier: SpendBySupplier[];
  spendByCategory: SpendByCategory[];
  spendTrends: SpendTrend[];
}

// ============================================================================
// SUPPLIER PERFORMANCE
// ============================================================================

export interface SupplierPerformanceData {
  supplierId: string;
  supplierName: string;
  onTimeDeliveryRate: number;
  qualityRating: number;
  communicationRating: number;
  overallRating: number;
  totalOrders: number;
  totalSpend: number;
  avgLeadTime: number;
  rejectionRate: number;
}

export interface PerformanceTrend {
  period: string;
  onTimeRate: number;
  qualityScore: number;
  overallScore: number;
}

export interface SupplierRanking {
  rank: number;
  supplierId: string;
  supplierName: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

// ============================================================================
// PROCUREMENT METRICS
// ============================================================================

export interface ProcurementKPI {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  status: 'good' | 'warning' | 'critical';
}

export interface OrderAnalytics {
  totalOrders: number;
  totalValue: number;
  avgOrderValue: number;
  avgLeadTime: number;
  onTimeDeliveryRate: number;
  approvalRate: number;
  completionRate: number;
}

export interface CostSavings {
  negotiatedSavings: number;
  volumeDiscounts: number;
  processImprovement: number;
  totalSavings: number;
  savingsPercent: number;
}

// ============================================================================
// REPORT CONFIGURATION
// ============================================================================

export const reportTypes = [
  'spend_analysis',
  'supplier_performance',
  'order_analytics',
  'cost_savings',
] as const;
export type AnalyticsReportType = (typeof reportTypes)[number];

export const exportFormats = ['pdf', 'excel', 'csv'] as const;
export type AnalyticsExportFormat = (typeof exportFormats)[number];

export interface AnalyticsReportConfig {
  type: AnalyticsReportType;
  dateRange: AnalyticsDateRange;
  supplierIds?: string[];
  categories?: string[];
  includeCharts: boolean;
  includeDetails: boolean;
}

export interface AnalyticsScheduledReport {
  id: string;
  name: string;
  config: AnalyticsReportConfig;
  schedule: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  lastRun?: string;
  nextRun: string;
  isActive: boolean;
}

// ============================================================================
// FILTERS
// ============================================================================

export const AnalyticsFiltersSchema = z.object({
  period: TimePeriodSchema.optional(),
  dateRange: AnalyticsDateRangeSchema.optional(),
  supplierIds: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
});

export type AnalyticsFilters = z.infer<typeof AnalyticsFiltersSchema>;
