/**
 * Procurement Reports Schemas
 *
 * Types and validation for procurement analytics and report configuration.
 */

import { z } from 'zod';
import type { DateRange } from '@/components/ui/date-picker-with-range';

// ============================================================================
// URL SEARCH SCHEMA
// ============================================================================

export const procurementReportsSearchSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  tab: z.enum(['overview', 'supplier-performance', 'spend-analysis', 'efficiency', 'cost-savings']).optional(),
});

export type ProcurementReportsSearch = z.infer<typeof procurementReportsSearchSchema>;

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface ProcurementAnalytics {
  supplierPerformance: Array<{
    supplierId: string;
    supplierName: string;
    totalOrders: number;
    totalSpend: number;
    avgOrderValue: number;
    qualityScore: number;
    onTimeDelivery: number;
    defectRate: number;
    leadTimeDays: number;
    costSavings: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  spendAnalysis: {
    byCategory: Array<{
      category: string;
      totalSpend: number;
      percentage: number;
      trend: number;
    }>;
    bySupplier: Array<{
      supplierId: string;
      supplierName: string;
      totalSpend: number;
      orderCount: number;
      avgOrderValue: number;
    }>;
    trends: Array<{
      date: string;
      spend: number;
      orders: number;
      savings: number;
    }>;
  };
  efficiencyMetrics: {
    avgProcessingTime: number;
    approvalCycleTime: number;
    orderFulfillmentRate: number;
    costSavingsRate: number;
    automationRate: number;
    supplierDiversity: number;
  };
  costSavings: {
    totalSavings: number;
    savingsByType: Array<{
      type: string;
      amount: number;
      percentage: number;
    }>;
    monthlySavings: Array<{
      month: string;
      negotiatedSavings: number;
      volumeDiscounts: number;
      processImprovements: number;
      total: number;
    }>;
  };
}

// ============================================================================
// REPORT CONFIG
// ============================================================================

export const reportConfigTypeSchema = z.enum([
  'supplier-performance',
  'spend-analysis',
  'efficiency',
  'cost-savings',
  'custom',
]);

export type ReportConfigType = z.infer<typeof reportConfigTypeSchema>;

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: ReportConfigType;
  dateRange: DateRange;
  filters: {
    suppliers?: string[];
    categories?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: 'pdf' | 'excel' | 'email';
  };
  createdBy: string;
  createdAt: string;
}

// ============================================================================
// PROPS
// ============================================================================

export type ProcurementTab = 'overview' | 'supplier-performance' | 'spend-analysis' | 'efficiency' | 'cost-savings';

export interface ProcurementReportsProps {
  analytics: ProcurementAnalytics | undefined;
  isLoading: boolean;
  error: Error | null;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  /** Active tab (synced to URL when provided) */
  activeTab?: ProcurementTab;
  /** Called when user switches tab (sync to URL) */
  onTabChange?: (tab: ProcurementTab) => void;
  onExport: (format: 'pdf' | 'excel' | 'csv') => void;
  onCreateCustomReport: (input: {
    name: string;
    description?: string;
    reportType: ReportConfigType;
  }) => void;
  onScheduleReport: () => void;
}
