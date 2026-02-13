/**
 * Warranty Analytics Schemas
 *
 * Zod schemas for warranty analytics server functions.
 * Supports date range filtering, claim type filtering, and warranty type filtering.
 *
 * @see src/server/functions/warranty-analytics.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-008
 */

import { z } from 'zod';

// ============================================================================
// COMMON FILTER SCHEMAS
// ============================================================================

export const warrantyDateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const warrantyAnalyticsFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  warrantyType: z
    .enum(['battery_performance', 'inverter_manufacturer', 'installation_workmanship', 'all'])
    .default('all'),
  claimType: z
    .enum([
      'cell_degradation',
      'bms_fault',
      'inverter_failure',
      'installation_defect',
      'other',
      'all',
    ])
    .default('all'),
});

export type WarrantyAnalyticsFilter = z.infer<typeof warrantyAnalyticsFilterSchema>;

// ============================================================================
// ANALYTICS SUMMARY
// ============================================================================

export const getWarrantyAnalyticsSummarySchema = warrantyAnalyticsFilterSchema;

export type GetWarrantyAnalyticsSummaryInput = z.infer<typeof getWarrantyAnalyticsSummarySchema>;

export interface WarrantyAnalyticsSummary {
  totalWarranties: number;
  activeClaims: number;
  claimsRate: number;
  averageClaimCost: number;
  totalClaimsCost: number;
  warrantyRevenue: number;
  // Period-over-period changes (percentage)
  warrantiesChange: number;
  claimsChange: number;
  claimsRateChange: number;
  avgCostChange: number;
  totalCostChange: number;
  revenueChange: number;
}

// ============================================================================
// CLAIMS BY PRODUCT
// ============================================================================

export const getClaimsByProductSchema = warrantyAnalyticsFilterSchema;

export type GetClaimsByProductInput = z.infer<typeof getClaimsByProductSchema>;

export interface ClaimsByProductItem {
  productId: string;
  productName: string;
  productSku: string | null;
  claimsCount: number;
  percentage: number;
  averageCost: number;
  totalCost: number;
}

export interface ClaimsByProductResult {
  items: ClaimsByProductItem[];
  totalClaims: number;
}

// ============================================================================
// CLAIMS TREND
// ============================================================================

export const getClaimsTrendSchema = z.object({
  months: z.number().min(1).max(24).default(6),
  warrantyType: z
    .enum(['battery_performance', 'inverter_manufacturer', 'installation_workmanship', 'all'])
    .default('all'),
  claimType: z
    .enum([
      'cell_degradation',
      'bms_fault',
      'inverter_failure',
      'installation_defect',
      'other',
      'all',
    ])
    .default('all'),
});

export type GetClaimsTrendInput = z.infer<typeof getClaimsTrendSchema>;

export interface ClaimsTrendItem {
  month: string;
  monthLabel: string;
  claimsCount: number;
  averageCost: number;
  totalCost: number;
}

export interface ClaimsTrendResult {
  items: ClaimsTrendItem[];
}

/** Row shape from db.execute() for claims trend SQL (snake_case). */
export const claimsTrendRowSchema = z.object({
  month: z.string(),
  claims_count: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  avg_cost: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  total_cost: z.union([z.number(), z.string()]).transform((v) => Number(v)),
});

export type ClaimsTrendRow = z.infer<typeof claimsTrendRowSchema>;

/** Row shape from db.execute() for SLA compliance metrics SQL (snake_case). */
export const slaComplianceMetricsRowSchema = z.object({
  total_claims: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  resolved_claims: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  pending_claims: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  within_response_sla: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  within_resolution_sla: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  avg_response_hours: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  avg_resolution_days: z.union([z.number(), z.string()]).transform((v) => Number(v)),
});

export type SlaComplianceMetricsRow = z.infer<typeof slaComplianceMetricsRowSchema>;

// ============================================================================
// CLAIMS BY TYPE
// ============================================================================

export const getClaimsByTypeSchema = warrantyAnalyticsFilterSchema;

export type GetClaimsByTypeInput = z.infer<typeof getClaimsByTypeSchema>;

export interface ClaimsByTypeItem {
  claimType: string;
  claimTypeLabel: string;
  count: number;
  percentage: number;
  averageCost: number;
  totalCost: number;
}

export interface ClaimsByTypeResult {
  items: ClaimsByTypeItem[];
  totalClaims: number;
}

// ============================================================================
// SLA COMPLIANCE
// ============================================================================

export const getSlaComplianceMetricsSchema = warrantyAnalyticsFilterSchema;

export type GetSlaComplianceMetricsInput = z.infer<typeof getSlaComplianceMetricsSchema>;

export interface SlaComplianceMetrics {
  // Response SLA (24h target)
  responseComplianceRate: number;
  claimsWithinResponseSla: number;
  claimsBreachedResponseSla: number;
  averageResponseTimeHours: number;
  // Resolution SLA (5 days target)
  resolutionComplianceRate: number;
  claimsWithinResolutionSla: number;
  claimsBreachedResolutionSla: number;
  averageResolutionTimeDays: number;
  // Totals
  totalResolvedClaims: number;
  totalPendingClaims: number;
}

// ============================================================================
// CYCLE COUNT AT CLAIM
// ============================================================================

export const getCycleCountAtClaimSchema = warrantyAnalyticsFilterSchema;

export type GetCycleCountAtClaimInput = z.infer<typeof getCycleCountAtClaimSchema>;

export interface CycleCountByClaimTypeItem {
  claimType: string;
  claimTypeLabel: string;
  averageCycleCount: number;
  minCycleCount: number;
  maxCycleCount: number;
  claimsWithCycleData: number;
}

export interface CycleCountAtClaimResult {
  overall: {
    averageCycleCount: number;
    minCycleCount: number;
    maxCycleCount: number;
    totalClaimsWithData: number;
  };
  byClaimType: CycleCountByClaimTypeItem[];
}

// ============================================================================
// EXTENSION VS RESOLUTION TYPE
// ============================================================================

export const getExtensionVsResolutionSchema = warrantyAnalyticsFilterSchema;

export type GetExtensionVsResolutionInput = z.infer<typeof getExtensionVsResolutionSchema>;

export interface ExtensionTypeBreakdown {
  extensionType: string;
  extensionTypeLabel: string;
  count: number;
  percentage: number;
  totalMonthsExtended: number;
  averageMonthsExtended: number;
  totalRevenue: number;
}

export interface ResolutionTypeBreakdown {
  resolutionType: string;
  resolutionTypeLabel: string;
  count: number;
  percentage: number;
  averageCost: number;
  totalCost: number;
}

export interface ExtensionVsResolutionResult {
  extensions: {
    items: ExtensionTypeBreakdown[];
    totalExtensions: number;
    totalRevenue: number;
  };
  resolutions: {
    items: ResolutionTypeBreakdown[];
    totalResolutions: number;
    totalCost: number;
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const exportWarrantyAnalyticsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  warrantyType: z
    .enum(['battery_performance', 'inverter_manufacturer', 'installation_workmanship', 'all'])
    .default('all'),
  claimType: z
    .enum([
      'cell_degradation',
      'bms_fault',
      'inverter_failure',
      'installation_defect',
      'other',
      'all',
    ])
    .default('all'),
  format: z.enum(['csv', 'json']).default('csv'),
});

export type ExportWarrantyAnalyticsInput = z.infer<typeof exportWarrantyAnalyticsSchema>;

export interface ExportWarrantyAnalyticsResult {
  data: string;
  filename: string;
  mimeType: string;
}

// ============================================================================
// FILTER OPTIONS
// ============================================================================

export interface WarrantyAnalyticsFilterOptions {
  products: Array<{ id: string; name: string }>;
  customers: Array<{ id: string; name: string }>;
  dateRanges: Array<{ value: string; label: string }>;
}
