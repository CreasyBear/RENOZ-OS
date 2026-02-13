'use server'

/**
 * Warranty Analytics Server Functions
 *
 * Aggregate queries for warranty analytics, including claims breakdown,
 * SLA compliance, trend analysis, and cycle count insights.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-008
 * @see src/lib/schemas/warranty/analytics.ts for schema definitions
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, gte, lte, sql, count, sum, avg, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  warranties,
  warrantyClaims,
  warrantyExtensions,
  products,
  customers,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  getWarrantyAnalyticsSummarySchema,
  getClaimsByProductSchema,
  getClaimsTrendSchema,
  getClaimsByTypeSchema,
  getSlaComplianceMetricsSchema,
  getCycleCountAtClaimSchema,
  getExtensionVsResolutionSchema,
  exportWarrantyAnalyticsSchema,
  claimsTrendRowSchema,
  slaComplianceMetricsRowSchema,
  type WarrantyAnalyticsSummary,
  type ClaimsByProductResult,
  type ClaimsTrendResult,
  type ClaimsByTypeResult,
  type SlaComplianceMetrics,
  type CycleCountAtClaimResult,
  type ExtensionVsResolutionResult,
  type ExportWarrantyAnalyticsResult,
  type WarrantyAnalyticsFilterOptions,
} from '@/lib/schemas/warranty/analytics';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get date range with defaults (last 30 days).
 */
function getDateRange(startDate?: string, endDate?: string) {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * Get previous period date range for comparison.
 */
function getPreviousPeriod(start: Date, end: Date) {
  const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);
  return { prevStart, prevEnd };
}

/**
 * Calculate percentage change between two values.
 */
function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get claim type label for display.
 */
function getClaimTypeLabel(claimType: string): string {
  const labels: Record<string, string> = {
    cell_degradation: 'Cell Degradation',
    bms_fault: 'BMS Fault',
    inverter_failure: 'Inverter Failure',
    installation_defect: 'Installation Defect',
    other: 'Other',
  };
  return labels[claimType] || claimType;
}

/**
 * Get extension type label for display.
 */
function getExtensionTypeLabel(extensionType: string): string {
  const labels: Record<string, string> = {
    paid_extension: 'Paid Extension',
    promotional: 'Promotional',
    loyalty_reward: 'Loyalty Reward',
    goodwill: 'Goodwill',
  };
  return labels[extensionType] || extensionType;
}

/**
 * Get resolution type label for display.
 */
function getResolutionTypeLabel(resolutionType: string): string {
  const labels: Record<string, string> = {
    repair: 'Repair',
    replacement: 'Replacement',
    refund: 'Refund',
    warranty_extension: 'Warranty Extension',
  };
  return labels[resolutionType] || resolutionType;
}

// ============================================================================
// GET WARRANTY ANALYTICS SUMMARY
// ============================================================================

/**
 * Get summary metrics for warranty analytics dashboard.
 */
export const getWarrantyAnalyticsSummary = createServerFn({ method: 'GET' })
  .inputValidator(getWarrantyAnalyticsSummarySchema)
  .handler(async ({ data }): Promise<WarrantyAnalyticsSummary> => {
    const ctx = await withAuth();
    const { startDate, endDate, claimType } = data;
    const { start, end } = getDateRange(startDate, endDate);
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);

    // Build where conditions for current period
    const baseConditions = [eq(warranties.organizationId, ctx.organizationId)];

    // Current period warranties
    const currentWarranties = await db
      .select({ count: count() })
      .from(warranties)
      .where(
        and(
          ...baseConditions,
          gte(warranties.registrationDate, start),
          lte(warranties.registrationDate, end)
        )
      );

    // Previous period warranties for comparison
    const previousWarranties = await db
      .select({ count: count() })
      .from(warranties)
      .where(
        and(
          ...baseConditions,
          gte(warranties.registrationDate, prevStart),
          lte(warranties.registrationDate, prevEnd)
        )
      );

    // Build claim conditions
    const claimConditions = [eq(warrantyClaims.organizationId, ctx.organizationId)];
    if (claimType !== 'all') {
      claimConditions.push(eq(warrantyClaims.claimType, claimType));
    }

    // Current period claims
    const currentClaims = await db
      .select({
        count: count(),
        totalCost: sum(warrantyClaims.cost),
        avgCost: avg(warrantyClaims.cost),
      })
      .from(warrantyClaims)
      .where(
        and(
          ...claimConditions,
          gte(warrantyClaims.submittedAt, start),
          lte(warrantyClaims.submittedAt, end)
        )
      );

    // Previous period claims for comparison
    const previousClaims = await db
      .select({
        count: count(),
        totalCost: sum(warrantyClaims.cost),
      })
      .from(warrantyClaims)
      .where(
        and(
          ...claimConditions,
          gte(warrantyClaims.submittedAt, prevStart),
          lte(warrantyClaims.submittedAt, prevEnd)
        )
      );

    // Active claims (not resolved)
    const activeClaims = await db
      .select({ count: count() })
      .from(warrantyClaims)
      .where(
        and(
          eq(warrantyClaims.organizationId, ctx.organizationId),
          ne(warrantyClaims.status, 'resolved'),
          ne(warrantyClaims.status, 'denied')
        )
      );

    // Warranty revenue from extensions (current period)
    const currentRevenue = await db
      .select({ total: sum(warrantyExtensions.price) })
      .from(warrantyExtensions)
      .where(
        and(
          eq(warrantyExtensions.organizationId, ctx.organizationId),
          gte(warrantyExtensions.createdAt, start),
          lte(warrantyExtensions.createdAt, end)
        )
      );

    // Previous period revenue for comparison
    const previousRevenue = await db
      .select({ total: sum(warrantyExtensions.price) })
      .from(warrantyExtensions)
      .where(
        and(
          eq(warrantyExtensions.organizationId, ctx.organizationId),
          gte(warrantyExtensions.createdAt, prevStart),
          lte(warrantyExtensions.createdAt, prevEnd)
        )
      );

    // Calculate metrics
    const totalWarranties = Number(currentWarranties[0]?.count ?? 0);
    const prevTotalWarranties = Number(previousWarranties[0]?.count ?? 0);
    const totalClaims = Number(currentClaims[0]?.count ?? 0);
    const prevTotalClaims = Number(previousClaims[0]?.count ?? 0);
    const claimsRate = totalWarranties > 0 ? (totalClaims / totalWarranties) * 100 : 0;
    const prevClaimsRate =
      prevTotalWarranties > 0 ? (prevTotalClaims / prevTotalWarranties) * 100 : 0;

    return {
      totalWarranties,
      activeClaims: Number(activeClaims[0]?.count ?? 0),
      claimsRate: Math.round(claimsRate * 10) / 10,
      averageClaimCost: Math.round(Number(currentClaims[0]?.avgCost ?? 0)),
      totalClaimsCost: Math.round(Number(currentClaims[0]?.totalCost ?? 0)),
      warrantyRevenue: Math.round(Number(currentRevenue[0]?.total ?? 0)),
      // Period-over-period changes
      warrantiesChange: calculatePercentChange(totalWarranties, prevTotalWarranties),
      claimsChange: calculatePercentChange(totalClaims, prevTotalClaims),
      claimsRateChange: Math.round((claimsRate - prevClaimsRate) * 10) / 10,
      avgCostChange: calculatePercentChange(
        Math.round(Number(currentClaims[0]?.avgCost ?? 0)),
        Math.round(Number(previousClaims[0]?.totalCost ?? 0) / Math.max(prevTotalClaims, 1))
      ),
      totalCostChange: calculatePercentChange(
        Math.round(Number(currentClaims[0]?.totalCost ?? 0)),
        Math.round(Number(previousClaims[0]?.totalCost ?? 0))
      ),
      revenueChange: calculatePercentChange(
        Math.round(Number(currentRevenue[0]?.total ?? 0)),
        Math.round(Number(previousRevenue[0]?.total ?? 0))
      ),
    };
  });

// ============================================================================
// GET CLAIMS BY PRODUCT
// ============================================================================

/**
 * Get claims breakdown by product/battery model.
 */
export const getClaimsByProduct = createServerFn({ method: 'GET' })
  .inputValidator(getClaimsByProductSchema)
  .handler(async ({ data }): Promise<ClaimsByProductResult> => {
    const ctx = await withAuth();
    const { startDate, endDate, claimType } = data;
    const { start, end } = getDateRange(startDate, endDate);

    // Build where conditions
    const conditions = [
      eq(warrantyClaims.organizationId, ctx.organizationId),
      gte(warrantyClaims.submittedAt, start),
      lte(warrantyClaims.submittedAt, end),
    ];
    if (claimType !== 'all') {
      conditions.push(eq(warrantyClaims.claimType, claimType));
    }

    // Get claims grouped by product
    const results = await db
      .select({
        productId: products.id,
        productName: products.name,
        productSku: products.sku,
        claimsCount: count(),
        totalCost: sum(warrantyClaims.cost),
        avgCost: avg(warrantyClaims.cost),
      })
      .from(warrantyClaims)
      .innerJoin(warranties, eq(warranties.id, warrantyClaims.warrantyId))
      .innerJoin(products, eq(products.id, warranties.productId))
      .where(and(...conditions))
      .groupBy(products.id, products.name, products.sku)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    // Calculate total for percentages
    const totalClaims = results.reduce((sum, r) => sum + Number(r.claimsCount), 0);

    return {
      items: results.map((r) => ({
        productId: r.productId,
        productName: r.productName ?? 'Unknown Product',
        productSku: r.productSku,
        claimsCount: Number(r.claimsCount),
        percentage: totalClaims > 0 ? Math.round((Number(r.claimsCount) / totalClaims) * 100) : 0,
        averageCost: Math.round(Number(r.avgCost ?? 0)),
        totalCost: Math.round(Number(r.totalCost ?? 0)),
      })),
      totalClaims,
    };
  });

// ============================================================================
// GET CLAIMS TREND
// ============================================================================

/**
 * Get monthly claims trend for line chart.
 */
export const getClaimsTrend = createServerFn({ method: 'GET' })
  .inputValidator(getClaimsTrendSchema)
  .handler(async ({ data }): Promise<ClaimsTrendResult> => {
    const ctx = await withAuth();
    const { months, claimType } = data;

    // Calculate date range for trend
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Build where conditions
    const conditions = [
      eq(warrantyClaims.organizationId, ctx.organizationId),
      gte(warrantyClaims.submittedAt, startDate),
      lte(warrantyClaims.submittedAt, endDate),
    ];
    if (claimType !== 'all') {
      conditions.push(eq(warrantyClaims.claimType, claimType));
    }

    // RAW SQL (Phase 11 Keep): Raw aggregations, DATE_TRUNC. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
    const rawResults = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', ${warrantyClaims.submittedAt}::timestamp), 'YYYY-MM') as month,
        COUNT(*) as claims_count,
        COALESCE(AVG(${warrantyClaims.cost}), 0) as avg_cost,
        COALESCE(SUM(${warrantyClaims.cost}), 0) as total_cost
      FROM ${warrantyClaims}
      WHERE ${warrantyClaims.organizationId} = ${ctx.organizationId}
        AND ${warrantyClaims.submittedAt} >= ${startDate}
        AND ${warrantyClaims.submittedAt} <= ${endDate}
        ${claimType !== 'all' ? sql`AND ${warrantyClaims.claimType} = ${claimType}` : sql``}
      GROUP BY DATE_TRUNC('month', ${warrantyClaims.submittedAt}::timestamp)
      ORDER BY month ASC
    `);

    const rows = Array.isArray(rawResults)
      ? rawResults
      : (rawResults as { rows: unknown[] }).rows ?? [];
    const resultsData = z.array(claimsTrendRowSchema).parse(rows);

    // Format month labels (map snake_case to camelCase in return)
    return {
      items: resultsData.map((r) => {
        const date = new Date(r.month + '-01');
        return {
          month: r.month,
          monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          claimsCount: r.claims_count,
          averageCost: Math.round(r.avg_cost),
          totalCost: Math.round(r.total_cost),
        };
      }),
    };
  });

// ============================================================================
// GET CLAIMS BY TYPE
// ============================================================================

/**
 * Get claims breakdown by claim type for pie/donut chart.
 */
export const getClaimsByType = createServerFn({ method: 'GET' })
  .inputValidator(getClaimsByTypeSchema)
  .handler(async ({ data }): Promise<ClaimsByTypeResult> => {
    const ctx = await withAuth();
    const { startDate, endDate } = data;
    const { start, end } = getDateRange(startDate, endDate);

    // Get claims grouped by type
    const results = await db
      .select({
        claimType: warrantyClaims.claimType,
        count: count(),
        totalCost: sum(warrantyClaims.cost),
        avgCost: avg(warrantyClaims.cost),
      })
      .from(warrantyClaims)
      .where(
        and(
          eq(warrantyClaims.organizationId, ctx.organizationId),
          gte(warrantyClaims.submittedAt, start),
          lte(warrantyClaims.submittedAt, end)
        )
      )
      .groupBy(warrantyClaims.claimType)
      .orderBy(sql`count(*) DESC`);

    // Calculate total for percentages
    const totalClaims = results.reduce((sum, r) => sum + Number(r.count), 0);

    return {
      items: results.map((r) => ({
        claimType: r.claimType,
        claimTypeLabel: getClaimTypeLabel(r.claimType),
        count: Number(r.count),
        percentage: totalClaims > 0 ? Math.round((Number(r.count) / totalClaims) * 100) : 0,
        averageCost: Math.round(Number(r.avgCost ?? 0)),
        totalCost: Math.round(Number(r.totalCost ?? 0)),
      })),
      totalClaims,
    };
  });

// ============================================================================
// GET SLA COMPLIANCE METRICS
// ============================================================================

/**
 * Get SLA compliance metrics for claims.
 */
export const getSlaComplianceMetrics = createServerFn({ method: 'GET' })
  .inputValidator(getSlaComplianceMetricsSchema)
  .handler(async ({ data }): Promise<SlaComplianceMetrics> => {
    const ctx = await withAuth();
    const { startDate, endDate, claimType } = data;
    const { start, end } = getDateRange(startDate, endDate);

    // Build where conditions
    const conditions = [
      eq(warrantyClaims.organizationId, ctx.organizationId),
      gte(warrantyClaims.submittedAt, start),
      lte(warrantyClaims.submittedAt, end),
    ];
    if (claimType !== 'all') {
      conditions.push(eq(warrantyClaims.claimType, claimType));
    }

    // Get SLA metrics using window for response/resolution times
    const rawMetrics = await db.execute(sql`
      WITH claim_metrics AS (
        SELECT
          id,
          status,
          submitted_at,
          resolved_at,
          created_at,
          EXTRACT(EPOCH FROM (COALESCE(created_at, submitted_at) - submitted_at)) / 3600 as response_hours,
          CASE
            WHEN resolved_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (resolved_at - submitted_at)) / 86400
            ELSE NULL
          END as resolution_days
        FROM ${warrantyClaims}
        WHERE ${warrantyClaims.organizationId} = ${ctx.organizationId}
          AND ${warrantyClaims.submittedAt} >= ${start}
          AND ${warrantyClaims.submittedAt} <= ${end}
          ${claimType !== 'all' ? sql`AND ${warrantyClaims.claimType} = ${claimType}` : sql``}
      )
      SELECT
        COUNT(*) as total_claims,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_claims,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'denied')) as pending_claims,
        COUNT(*) FILTER (WHERE response_hours <= 24) as within_response_sla,
        COUNT(*) FILTER (WHERE resolution_days <= 5) as within_resolution_sla,
        COALESCE(AVG(response_hours), 0) as avg_response_hours,
        COALESCE(AVG(resolution_days) FILTER (WHERE resolution_days IS NOT NULL), 0) as avg_resolution_days
      FROM claim_metrics
    `);

    const metricsRows = Array.isArray(rawMetrics)
      ? rawMetrics
      : (rawMetrics as { rows: unknown[] }).rows ?? [];
    const metricsData = z.array(slaComplianceMetricsRowSchema).parse(metricsRows);
    const m = metricsData[0] ?? {
      total_claims: 0,
      resolved_claims: 0,
      pending_claims: 0,
      within_response_sla: 0,
      within_resolution_sla: 0,
      avg_response_hours: 0,
      avg_resolution_days: 0,
    };

    const totalClaims = m.total_claims;
    const resolvedClaims = m.resolved_claims;
    const breachedResponse = totalClaims - m.within_response_sla;
    const breachedResolution = resolvedClaims - m.within_resolution_sla;

    return {
      responseComplianceRate:
        totalClaims > 0 ? Math.round((Number(m.within_response_sla) / totalClaims) * 100) : 100,
      claimsWithinResponseSla: Number(m.within_response_sla),
      claimsBreachedResponseSla: Math.max(0, breachedResponse),
      averageResponseTimeHours: Math.round(Number(m.avg_response_hours) * 10) / 10,
      resolutionComplianceRate:
        resolvedClaims > 0
          ? Math.round((Number(m.within_resolution_sla) / resolvedClaims) * 100)
          : 100,
      claimsWithinResolutionSla: Number(m.within_resolution_sla),
      claimsBreachedResolutionSla: Math.max(0, breachedResolution),
      averageResolutionTimeDays: Math.round(Number(m.avg_resolution_days) * 10) / 10,
      totalResolvedClaims: resolvedClaims,
      totalPendingClaims: Number(m.pending_claims),
    };
  });

// ============================================================================
// GET CYCLE COUNT AT CLAIM
// ============================================================================

/**
 * Get average cycle count when claims are filed.
 */
export const getCycleCountAtClaim = createServerFn({ method: 'GET' })
  .inputValidator(getCycleCountAtClaimSchema)
  .handler(async ({ data }): Promise<CycleCountAtClaimResult> => {
    const ctx = await withAuth();
    const { startDate, endDate, claimType } = data;
    const { start, end } = getDateRange(startDate, endDate);

    // Build where conditions
    const conditions = [
      eq(warrantyClaims.organizationId, ctx.organizationId),
      gte(warrantyClaims.submittedAt, start),
      lte(warrantyClaims.submittedAt, end),
      sql`${warrantyClaims.cycleCountAtClaim} IS NOT NULL`,
    ];
    if (claimType !== 'all') {
      conditions.push(eq(warrantyClaims.claimType, claimType));
    }

    // Get overall cycle count stats
    const overallStats = await db
      .select({
        avgCycleCount: avg(warrantyClaims.cycleCountAtClaim),
        minCycleCount: sql<number>`MIN(${warrantyClaims.cycleCountAtClaim})`,
        maxCycleCount: sql<number>`MAX(${warrantyClaims.cycleCountAtClaim})`,
        count: count(),
      })
      .from(warrantyClaims)
      .where(and(...conditions));

    // Get cycle count stats by claim type
    const byClaimType = await db
      .select({
        claimType: warrantyClaims.claimType,
        avgCycleCount: avg(warrantyClaims.cycleCountAtClaim),
        minCycleCount: sql<number>`MIN(${warrantyClaims.cycleCountAtClaim})`,
        maxCycleCount: sql<number>`MAX(${warrantyClaims.cycleCountAtClaim})`,
        count: count(),
      })
      .from(warrantyClaims)
      .where(and(...conditions))
      .groupBy(warrantyClaims.claimType)
      .orderBy(sql`AVG(${warrantyClaims.cycleCountAtClaim}) DESC`);

    const overall = overallStats[0] || {
      avgCycleCount: 0,
      minCycleCount: 0,
      maxCycleCount: 0,
      count: 0,
    };

    return {
      overall: {
        averageCycleCount: Math.round(Number(overall.avgCycleCount ?? 0)),
        minCycleCount: Number(overall.minCycleCount ?? 0),
        maxCycleCount: Number(overall.maxCycleCount ?? 0),
        totalClaimsWithData: Number(overall.count),
      },
      byClaimType: byClaimType.map((r) => ({
        claimType: r.claimType,
        claimTypeLabel: getClaimTypeLabel(r.claimType),
        averageCycleCount: Math.round(Number(r.avgCycleCount ?? 0)),
        minCycleCount: Number(r.minCycleCount ?? 0),
        maxCycleCount: Number(r.maxCycleCount ?? 0),
        claimsWithCycleData: Number(r.count),
      })),
    };
  });

// ============================================================================
// GET EXTENSION VS RESOLUTION
// ============================================================================

/**
 * Get extension type vs resolution type breakdown.
 */
export const getExtensionVsResolution = createServerFn({ method: 'GET' })
  .inputValidator(getExtensionVsResolutionSchema)
  .handler(async ({ data }): Promise<ExtensionVsResolutionResult> => {
    const ctx = await withAuth();
    const { startDate, endDate } = data;
    const { start, end } = getDateRange(startDate, endDate);

    // Get extensions by type
    const extensionResults = await db
      .select({
        extensionType: warrantyExtensions.extensionType,
        count: count(),
        totalMonths: sum(warrantyExtensions.extensionMonths),
        avgMonths: avg(warrantyExtensions.extensionMonths),
        totalRevenue: sum(warrantyExtensions.price),
      })
      .from(warrantyExtensions)
      .where(
        and(
          eq(warrantyExtensions.organizationId, ctx.organizationId),
          gte(warrantyExtensions.createdAt, start),
          lte(warrantyExtensions.createdAt, end)
        )
      )
      .groupBy(warrantyExtensions.extensionType)
      .orderBy(sql`count(*) DESC`);

    // Get resolutions by type
    const resolutionResults = await db
      .select({
        resolutionType: warrantyClaims.resolutionType,
        count: count(),
        totalCost: sum(warrantyClaims.cost),
        avgCost: avg(warrantyClaims.cost),
      })
      .from(warrantyClaims)
      .where(
        and(
          eq(warrantyClaims.organizationId, ctx.organizationId),
          eq(warrantyClaims.status, 'resolved'),
          sql`${warrantyClaims.resolutionType} IS NOT NULL`,
          gte(warrantyClaims.resolvedAt, start),
          lte(warrantyClaims.resolvedAt, end)
        )
      )
      .groupBy(warrantyClaims.resolutionType)
      .orderBy(sql`count(*) DESC`);

    // Calculate totals
    const totalExtensions = extensionResults.reduce((sum, r) => sum + Number(r.count), 0);
    const totalExtensionRevenue = extensionResults.reduce(
      (sum, r) => sum + Number(r.totalRevenue ?? 0),
      0
    );
    const totalResolutions = resolutionResults.reduce((sum, r) => sum + Number(r.count), 0);
    const totalResolutionCost = resolutionResults.reduce(
      (sum, r) => sum + Number(r.totalCost ?? 0),
      0
    );

    return {
      extensions: {
        items: extensionResults.map((r) => ({
          extensionType: r.extensionType,
          extensionTypeLabel: getExtensionTypeLabel(r.extensionType),
          count: Number(r.count),
          percentage:
            totalExtensions > 0 ? Math.round((Number(r.count) / totalExtensions) * 100) : 0,
          totalMonthsExtended: Number(r.totalMonths ?? 0),
          averageMonthsExtended: Math.round(Number(r.avgMonths ?? 0) * 10) / 10,
          totalRevenue: Math.round(Number(r.totalRevenue ?? 0)),
        })),
        totalExtensions,
        totalRevenue: Math.round(totalExtensionRevenue),
      },
      resolutions: {
        items: resolutionResults.map((r) => ({
          resolutionType: r.resolutionType ?? 'unknown',
          resolutionTypeLabel: getResolutionTypeLabel(r.resolutionType ?? 'unknown'),
          count: Number(r.count),
          percentage:
            totalResolutions > 0 ? Math.round((Number(r.count) / totalResolutions) * 100) : 0,
          averageCost: Math.round(Number(r.avgCost ?? 0)),
          totalCost: Math.round(Number(r.totalCost ?? 0)),
        })),
        totalResolutions,
        totalCost: Math.round(totalResolutionCost),
      },
    };
  });

// ============================================================================
// EXPORT WARRANTY ANALYTICS
// ============================================================================

/**
 * Export warranty analytics data to CSV.
 */
export const exportWarrantyAnalytics = createServerFn({ method: 'GET' })
  .inputValidator(exportWarrantyAnalyticsSchema)
  .handler(async ({ data }): Promise<ExportWarrantyAnalyticsResult> => {
    await withAuth(); // Auth check only, no ctx needed
    const { startDate, endDate, warrantyType, claimType, format } = data;

    // Get all analytics data
    const [summary, byProduct, byType, slaMetrics, cycleCount, extensionVsResolution] =
      await Promise.all([
        getWarrantyAnalyticsSummary({ data: { startDate, endDate, warrantyType, claimType } }),
        getClaimsByProduct({ data: { startDate, endDate, warrantyType, claimType } }),
        getClaimsByType({ data: { startDate, endDate, warrantyType } }),
        getSlaComplianceMetrics({ data: { startDate, endDate, warrantyType, claimType } }),
        getCycleCountAtClaim({ data: { startDate, endDate, warrantyType, claimType } }),
        getExtensionVsResolution({ data: { startDate, endDate } }),
      ]);

    const dateRange = `${startDate || 'All time'} to ${endDate || 'Present'}`;

    if (format === 'json') {
      return {
        data: JSON.stringify(
          {
            dateRange,
            summary,
            claimsByProduct: byProduct,
            claimsByType: byType,
            slaCompliance: slaMetrics,
            cycleCountAnalysis: cycleCount,
            extensionsVsResolutions: extensionVsResolution,
          },
          null,
          2
        ),
        filename: `warranty-analytics-${new Date().toISOString().split('T')[0]}.json`,
        mimeType: 'application/json',
      };
    }

    // Build CSV content
    const lines: string[] = [
      'Warranty Analytics Report',
      `Date Range: ${dateRange}`,
      '',
      'SUMMARY METRICS',
      'Metric,Value,Change',
      `Total Warranties,${summary.totalWarranties},${summary.warrantiesChange}%`,
      `Active Claims,${summary.activeClaims},-`,
      `Claims Rate,${summary.claimsRate}%,${summary.claimsRateChange}%`,
      `Average Claim Cost,$${summary.averageClaimCost},${summary.avgCostChange}%`,
      `Total Claims Cost,$${summary.totalClaimsCost},${summary.totalCostChange}%`,
      `Warranty Revenue,$${summary.warrantyRevenue},${summary.revenueChange}%`,
      '',
      'CLAIMS BY PRODUCT',
      'Product,SKU,Claims,Percentage,Avg Cost,Total Cost',
      ...byProduct.items.map(
        (p) =>
          `"${p.productName}",${p.productSku || 'N/A'},${p.claimsCount},${p.percentage}%,$${p.averageCost},$${p.totalCost}`
      ),
      '',
      'CLAIMS BY TYPE',
      'Type,Count,Percentage,Avg Cost,Total Cost',
      ...byType.items.map(
        (t) => `${t.claimTypeLabel},${t.count},${t.percentage}%,$${t.averageCost},$${t.totalCost}`
      ),
      '',
      'SLA COMPLIANCE',
      'Metric,Value',
      `Response SLA Compliance,${slaMetrics.responseComplianceRate}%`,
      `Claims Within Response SLA,${slaMetrics.claimsWithinResponseSla}`,
      `Claims Breached Response SLA,${slaMetrics.claimsBreachedResponseSla}`,
      `Avg Response Time (hours),${slaMetrics.averageResponseTimeHours}`,
      `Resolution SLA Compliance,${slaMetrics.resolutionComplianceRate}%`,
      `Claims Within Resolution SLA,${slaMetrics.claimsWithinResolutionSla}`,
      `Claims Breached Resolution SLA,${slaMetrics.claimsBreachedResolutionSla}`,
      `Avg Resolution Time (days),${slaMetrics.averageResolutionTimeDays}`,
      '',
      'CYCLE COUNT AT CLAIM',
      'Claim Type,Avg Cycle Count,Min,Max,Claims with Data',
      ...cycleCount.byClaimType.map(
        (c) =>
          `${c.claimTypeLabel},${c.averageCycleCount},${c.minCycleCount},${c.maxCycleCount},${c.claimsWithCycleData}`
      ),
      '',
      'EXTENSION TYPES',
      'Type,Count,Percentage,Avg Months,Total Revenue',
      ...extensionVsResolution.extensions.items.map(
        (e) =>
          `${e.extensionTypeLabel},${e.count},${e.percentage}%,${e.averageMonthsExtended},$${e.totalRevenue}`
      ),
      '',
      'RESOLUTION TYPES',
      'Type,Count,Percentage,Avg Cost,Total Cost',
      ...extensionVsResolution.resolutions.items.map(
        (r) =>
          `${r.resolutionTypeLabel},${r.count},${r.percentage}%,$${r.averageCost},$${r.totalCost}`
      ),
    ];

    return {
      data: lines.join('\n'),
      filename: `warranty-analytics-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
    };
  });

// ============================================================================
// GET FILTER OPTIONS
// ============================================================================

/**
 * Get filter options for the analytics UI.
 */
export const getWarrantyAnalyticsFilterOptions = createServerFn({ method: 'GET' })
  .handler(async (): Promise<WarrantyAnalyticsFilterOptions> => {
    const ctx = await withAuth();

    // Get products with warranties
    const productOptions = await db
      .selectDistinct({
        id: products.id,
        name: products.name,
      })
      .from(products)
      .innerJoin(warranties, eq(warranties.productId, products.id))
      .where(eq(warranties.organizationId, ctx.organizationId))
      .limit(100);

    // Get customers with warranties
    const customerOptions = await db
      .selectDistinct({
        id: customers.id,
        name: customers.name,
      })
      .from(customers)
      .innerJoin(warranties, eq(warranties.customerId, customers.id))
      .where(eq(warranties.organizationId, ctx.organizationId))
      .limit(100);

    return {
      products: productOptions.map((p) => ({ id: p.id, name: p.name ?? 'Unknown' })),
      customers: customerOptions.map((c) => ({ id: c.id, name: c.name ?? 'Unknown' })),
      dateRanges: [
        { value: '7', label: 'Last 7 days' },
        { value: '30', label: 'Last 30 days' },
        { value: '60', label: 'Last 60 days' },
        { value: '90', label: 'Last 90 days' },
        { value: '365', label: 'Last 12 months' },
        { value: 'all', label: 'All time' },
      ],
    };
  });
