/**
 * Warranty Analytics Report Schemas
 *
 * Types for warranty analytics dashboard and filter options.
 */

import { z } from 'zod';
import type { ScheduledReportFormProps } from '@/components/domain/settings/scheduled-report-form';
import type {
  WarrantyAnalyticsSummary,
  ClaimsByProductResult,
  ClaimsTrendResult,
  ClaimsByTypeResult,
  SlaComplianceMetrics,
  CycleCountAtClaimResult,
  ExtensionVsResolutionResult,
} from '@/lib/schemas/warranty/analytics';

// ============================================================================
// SEARCH PARAMS
// ============================================================================

export const warrantyAnalyticsSearchSchema = z.object({
  range: z.enum(['7', '30', '60', '90', '365', 'all']).default('30').catch('30'),
  warrantyType: z
    .enum(['battery_performance', 'inverter_manufacturer', 'installation_workmanship', 'all'])
    .default('all')
    .catch('all'),
  claimType: z
    .enum([
      'cell_degradation',
      'bms_fault',
      'inverter_failure',
      'installation_defect',
      'other',
      'all',
    ])
    .default('all')
    .catch('all'),
});

export type WarrantyAnalyticsSearchParams = z.infer<typeof warrantyAnalyticsSearchSchema>;

// ============================================================================
// DASHBOARD TYPE (explicit, replaces ReturnType inference)
// ============================================================================

export interface WarrantyAnalyticsDashboard {
  summary: WarrantyAnalyticsSummary | undefined;
  claimsByProduct: ClaimsByProductResult | undefined;
  claimsTrend: ClaimsTrendResult | undefined;
  claimsByType: ClaimsByTypeResult | undefined;
  slaCompliance: SlaComplianceMetrics | undefined;
  cycleCount: CycleCountAtClaimResult | undefined;
  extensionVsResolution: ExtensionVsResolutionResult | undefined;
  isLoading: boolean;
  isError: boolean;
  refetchAll: () => Promise<void>;
  queries: {
    summary: { refetch: () => Promise<unknown>; isLoading: boolean; isError: boolean };
    claimsByProduct: { refetch: () => Promise<unknown>; isLoading: boolean; isError: boolean };
    claimsTrend: { refetch: () => Promise<unknown>; isLoading: boolean; isError: boolean };
    claimsByType: { refetch: () => Promise<unknown>; isLoading: boolean; isError: boolean };
    slaCompliance: { refetch: () => Promise<unknown>; isLoading: boolean; isError: boolean };
    cycleCount: { refetch: () => Promise<unknown>; isLoading: boolean; isError: boolean };
    extensionVsResolution: { refetch: () => Promise<unknown>; isLoading: boolean; isError: boolean };
  };
}

// ============================================================================
// FILTER OPTIONS
// ============================================================================

export type FilterOption<T extends string> = { value: T; label: string };

export type AnalyticsFilterBadge = {
  key: 'range' | 'warrantyType' | 'claimType';
  label: string;
};

// ============================================================================
// VIEW PROPS
// ============================================================================

export interface WarrantyAnalyticsViewProps {
  search: WarrantyAnalyticsSearchParams;
  mobileFilters: WarrantyAnalyticsSearchParams;
  rangeOptions: FilterOption<WarrantyAnalyticsSearchParams['range']>[];
  warrantyTypeOptions: FilterOption<WarrantyAnalyticsSearchParams['warrantyType']>[];
  claimTypeOptions: FilterOption<WarrantyAnalyticsSearchParams['claimType']>[];
  hasActiveFilters: boolean;
  activeFilterBadges: AnalyticsFilterBadge[];
  dashboard: WarrantyAnalyticsDashboard;
  isExporting: boolean;
  scheduleOpen: boolean;
  isScheduleSubmitting: boolean;
  onUpdateSearch: (updates: Partial<WarrantyAnalyticsSearchParams>) => void;
  onMobileFilterChange: (updates: Partial<WarrantyAnalyticsSearchParams>) => void;
  onResetMobileFilters: () => void;
  onApplyMobileFilters: () => void;
  onClearAllFilters: () => void;
  onExport: (format: 'csv' | 'json') => void;
  onExportFile: (format: 'pdf' | 'excel') => void;
  onOpenSchedule: () => void;
  onScheduleOpenChange: (open: boolean) => void;
  onScheduleSubmit: ScheduledReportFormProps['onSubmit'];
}
