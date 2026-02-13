'use server'

/**
 * Metric Aggregator
 *
 * Single function for calculating all metrics.
 * Uses metric registry for consistent calculations across all report types.
 *
 * ⚠️ SERVER-ONLY: Uses database queries via Drizzle ORM.
 *
 * @see src/lib/metrics/registry.ts
 */

import { db } from '@/lib/db';
import { eq, and, gte, lte, isNull, inArray, sql, count, sum, avg } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { orders } from 'drizzle/schema/orders/orders';
import { customers } from 'drizzle/schema/customers/customers';
import { opportunities } from 'drizzle/schema/pipeline';
import { warranties } from 'drizzle/schema/warranty/warranties';
import { warrantyClaims } from 'drizzle/schema/warranty/warranty-claims';
import { slaTracking } from 'drizzle/schema/support/sla-tracking';
import { getMetric, type MetricId } from '@/lib/metrics/registry';
import type { MetricDefinition } from '@/lib/metrics/registry';
import type { SQLWrapper } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import type { OrderStatus } from '@/lib/schemas/orders';
import type { OpportunityStage } from '@/lib/schemas/pipeline';
import type { WarrantyStatus } from '@/lib/schemas/warranty';

// ============================================================================
// TYPES
// ============================================================================

export interface CalculateMetricOptions {
  organizationId: string;
  metricId: MetricId | string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
}

export interface MetricResult {
  value: number;
  metricId: string;
  calculatedAt: Date;
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizeDate(date: Date | string): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

function normalizeDateString(date: Date | string): string {
  const d = normalizeDate(date);
  return d.toISOString().split('T')[0];
}

/**
 * Get Drizzle column for a field name in a table.
 * Maps metric.field strings to actual typed Drizzle columns.
 * Uses Drizzle's typed aggregation functions (sum, avg) instead of raw SQL.
 */
function getColumnForField(table: MetricDefinition['table'], field: string): SQLWrapper {
  switch (table) {
    case 'orders':
      switch (field) {
        case 'total':
          return orders.total;
        case 'subtotal':
          return orders.subtotal;
        default:
          throw new Error(`Unknown field ${field} for orders table. Available: total, subtotal`);
      }
    case 'opportunities':
      switch (field) {
        case 'value':
          return opportunities.value;
        case 'weightedValue':
          return opportunities.weightedValue;
        default:
          throw new Error(`Unknown field ${field} for opportunities table. Available: value, weightedValue`);
      }
    default:
      throw new Error(`Field access not supported for table ${table}`);
  }
}

// ============================================================================
// CALCULATE SINGLE METRIC
// ============================================================================

/**
 * Calculate a single metric value.
 * This is the ONLY function that calculates metrics.
 */
export async function calculateMetric(options: CalculateMetricOptions): Promise<MetricResult> {
  const { organizationId, metricId, dateFrom, dateTo } = options;
  
  // Validate inputs
  if (!organizationId) {
    throw new Error('organizationId is required');
  }
  
  if (!metricId) {
    throw new Error('metricId is required');
  }
  
  let metric: ReturnType<typeof getMetric>;
  try {
    metric = getMetric(metricId);
  } catch (error) {
    throw new Error(`Invalid metric ID: ${metricId}. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Validate date range if required
  if (metric.requiresDateRange && (!dateFrom || !dateTo)) {
    throw new Error(`Metric ${metricId} requires a date range`);
  }
  
  // Validate date range order
  if (dateFrom && dateTo) {
    const from = normalizeDate(dateFrom);
    const to = normalizeDate(dateTo);
    if (to < from) {
      throw new Error(`Invalid date range: end date (${dateTo}) must be after start date (${dateFrom})`);
    }
  }
  
  // Build base conditions
  const conditions: SQL[] = [];
  
  // Organization filter (always required)
  switch (metric.table) {
    case 'orders':
      conditions.push(eq(orders.organizationId, organizationId));
      conditions.push(isNull(orders.deletedAt));
      break;
    case 'customers':
      conditions.push(eq(customers.organizationId, organizationId));
      conditions.push(isNull(customers.deletedAt));
      break;
    case 'opportunities':
      conditions.push(eq(opportunities.organizationId, organizationId));
      conditions.push(isNull(opportunities.deletedAt));
      break;
    case 'warranties':
      conditions.push(eq(warranties.organizationId, organizationId));
      break;
    case 'warrantyClaims':
      conditions.push(eq(warrantyClaims.organizationId, organizationId));
      break;
    case 'slaTracking':
      conditions.push(eq(slaTracking.organizationId, organizationId));
      break;
  }
  
  // Apply base filters from metric definition
  if (metric.baseFilters.status && metric.baseFilters.status.length > 0) {
    switch (metric.table) {
      case 'orders':
        conditions.push(inArray(orders.status, metric.baseFilters.status as OrderStatus[]));
        break;
      case 'opportunities':
        conditions.push(inArray(opportunities.stage, metric.baseFilters.status as OpportunityStage[]));
        break;
      case 'warranties':
        conditions.push(inArray(warranties.status, metric.baseFilters.status as WarrantyStatus[]));
        break;
    }
  }

  // Apply domain filter for SLA tracking (domain enum: 'support' | 'warranty' | 'jobs')
  if (metric.baseFilters.domain && metric.table === 'slaTracking') {
    conditions.push(eq(slaTracking.domain, metric.baseFilters.domain as 'support' | 'warranty' | 'jobs'));
  }
  
  // Apply date range filter
  if (dateFrom && dateTo && metric.requiresDateRange) {
    const fromDate = normalizeDate(dateFrom);
    const toDate = normalizeDate(dateTo);
    const fromDateStr = normalizeDateString(dateFrom);
    const toDateStr = normalizeDateString(dateTo);
    
    switch (metric.table) {
      case 'orders':
        if (metric.dateField === 'deliveredDate') {
          conditions.push(gte(orders.deliveredDate, fromDateStr));
          conditions.push(lte(orders.deliveredDate, toDateStr));
        } else if (metric.dateField === 'orderDate') {
          conditions.push(gte(orders.orderDate, fromDateStr));
          conditions.push(lte(orders.orderDate, toDateStr));
        } else {
          conditions.push(gte(orders.createdAt, fromDate));
          conditions.push(lte(orders.createdAt, toDate));
        }
        break;
      case 'customers':
        conditions.push(gte(customers.createdAt, fromDate));
        conditions.push(lte(customers.createdAt, toDate));
        break;
      case 'opportunities':
        if (metric.dateField === 'expectedCloseDate') {
          conditions.push(gte(opportunities.expectedCloseDate, fromDateStr));
          conditions.push(lte(opportunities.expectedCloseDate, toDateStr));
        } else if (metric.dateField === 'actualCloseDate') {
          conditions.push(gte(opportunities.actualCloseDate, fromDateStr));
          conditions.push(lte(opportunities.actualCloseDate, toDateStr));
        } else {
          conditions.push(gte(opportunities.createdAt, fromDate));
          conditions.push(lte(opportunities.createdAt, toDate));
        }
        break;
      case 'warranties':
        if (metric.dateField === 'registrationDate') {
          conditions.push(gte(warranties.registrationDate, fromDate));
          conditions.push(lte(warranties.registrationDate, toDate));
        } else if (metric.dateField === 'expiryDate') {
          conditions.push(gte(warranties.expiryDate, fromDate));
          conditions.push(lte(warranties.expiryDate, toDate));
        }
        break;
      case 'warrantyClaims':
        conditions.push(gte(warrantyClaims.submittedAt, fromDate));
        conditions.push(lte(warrantyClaims.submittedAt, toDate));
        break;
      case 'slaTracking':
        conditions.push(gte(slaTracking.startedAt, fromDate));
        conditions.push(lte(slaTracking.startedAt, toDate));
        break;
    }
  }
  
  const whereClause = and(...conditions);
  
  // Handle special cases
  if (metric.aggregation === 'SPECIAL') {
    return calculateSpecialMetric(metric, whereClause, dateFrom, dateTo);
  }
  
  // Handle WARRANTY_VALUE (requires join)
  if (metricId === 'warranty_value') {
    return calculateWarrantyValue(whereClause, organizationId);
  }
  
  // Standard aggregation using Drizzle functions
  let result: { value: number }[];
  
  switch (metric.table) {
    case 'orders': {
      if (metric.aggregation === 'SUM') {
        // Use Drizzle sum() with typed column - handle nulls in JS
        const column = getColumnForField('orders', metric.field);
        const [row] = await db
          .select({ value: sum(column) })
          .from(orders)
          .where(whereClause);
        result = [{ value: Number(row?.value ?? 0) }];
      } else if (metric.aggregation === 'AVG') {
        // Use Drizzle avg() with typed column - handle nulls in JS
        const column = getColumnForField('orders', metric.field);
        const [row] = await db
          .select({ value: avg(column) })
          .from(orders)
          .where(whereClause);
        result = [{ value: Number(row?.value ?? 0) }];
      } else {
        // COUNT - use Drizzle's count() function
        result = await db
          .select({ value: count() })
          .from(orders)
          .where(whereClause);
      }
      break;
    }
    
    case 'customers': {
      // COUNT - use Drizzle's count() function
      result = await db
        .select({ value: count() })
        .from(customers)
        .where(whereClause);
      break;
    }
    
    case 'opportunities': {
      if (metric.aggregation === 'SUM') {
        // Use Drizzle sum() with typed column - handle nulls
        const column = getColumnForField('opportunities', metric.field);
        const [row] = await db
          .select({ value: sum(column) })
          .from(opportunities)
          .where(whereClause);
        result = [{ value: Number(row?.value ?? 0) }];
      } else {
        // COUNT - use Drizzle's count() function
        result = await db
          .select({ value: count() })
          .from(opportunities)
          .where(whereClause);
      }
      break;
    }
    
    case 'warranties': {
      // COUNT - use Drizzle's count() function
      result = await db
        .select({ value: count() })
        .from(warranties)
        .where(whereClause);
      break;
    }
    
    case 'warrantyClaims': {
      // COUNT - use Drizzle's count() function
      result = await db
        .select({ value: count() })
        .from(warrantyClaims)
        .where(whereClause);
      break;
    }
    
    case 'slaTracking': {
      // COUNT - use Drizzle's count() function
      result = await db
        .select({ value: count() })
        .from(slaTracking)
        .where(whereClause);
      break;
    }
    
    default:
      throw new Error(`Unsupported table: ${metric.table}`);
  }
  
  return {
    value: Number(result[0]?.value ?? 0),
    metricId: metric.id,
    calculatedAt: new Date(),
  };
}

// ============================================================================
// SPECIAL METRICS
// ============================================================================

async function calculateSpecialMetric(
  metric: MetricDefinition,
  whereClause: ReturnType<typeof and>,
  _dateFrom?: Date | string,
  _dateTo?: Date | string
): Promise<MetricResult> {
  if (metric.id === 'win_rate') {
    // Calculate win rate: won / (won + lost) * 100
    // Use Drizzle count() with conditional expressions
    const [result] = await db
      .select({
        won: count(sql`CASE WHEN ${opportunities.stage} = 'won' THEN 1 END`),
        total: count(sql`CASE WHEN ${opportunities.stage} IN ('won', 'lost') THEN 1 END`),
      })
      .from(opportunities)
      .where(whereClause);
    
    const won = Number(result?.won ?? 0);
    const total = Number(result?.total ?? 0);
    
    return {
      value: total > 0 ? Math.round((won / total) * 100) : 0,
      metricId: metric.id,
      calculatedAt: new Date(),
    };
  }
  
  if (metric.id === 'sla_compliance') {
    // Calculate SLA compliance: (total - breached) / total * 100
    // Use Drizzle count() for total
    // Raw SQL required for CASE expression with OR condition (Drizzle doesn't support this pattern)
    const [result] = await db
      .select({
        total: count(),
        breached: sql<number>`SUM(CASE WHEN ${slaTracking.responseBreached} OR ${slaTracking.resolutionBreached} THEN 1 ELSE 0 END)`,
      })
      .from(slaTracking)
      .where(whereClause);
    
    const total = Number(result?.total ?? 0);
    const breached = Number(result?.breached ?? 0);
    
    return {
      value: total > 0 ? Math.round(((total - breached) / total) * 100) : 0,
      metricId: metric.id,
      calculatedAt: new Date(),
    };
  }
  
  throw new Error(`Unknown special metric: ${metric.id}`);
}

async function calculateWarrantyValue(
  whereClause: ReturnType<typeof and>,
  organizationId: string
): Promise<MetricResult> {
  // WARRANTY_VALUE requires join with orders
  // Use Drizzle sum() function with typed column - handle nulls
  const [result] = await db
    .select({
      total: sum(orders.total),
    })
    .from(warranties)
    .leftJoin(orders, eq(warranties.orderId, orders.id))
    .where(
      and(
        whereClause,
        eq(orders.organizationId, organizationId),
        isNull(orders.deletedAt)
      )
    );
  
  return {
    value: Number(result?.total ?? 0),
    metricId: 'warranty_value',
    calculatedAt: new Date(),
  };
}

// ============================================================================
// CALCULATE MULTIPLE METRICS
// ============================================================================

/**
 * Calculate multiple metrics in parallel.
 * Used by scheduled reports and dashboards.
 */
export async function calculateMetrics(options: {
  organizationId: string;
  metricIds: (MetricId | string)[];
  dateFrom?: Date | string;
  dateTo?: Date | string;
}): Promise<Record<string, number>> {
  const { organizationId, metricIds, dateFrom, dateTo } = options;
  
  // Validate inputs
  if (!organizationId) {
    throw new Error('organizationId is required');
  }
  
  if (!metricIds || metricIds.length === 0) {
    throw new Error('At least one metricId is required');
  }
  
  // Deduplicate metric IDs to avoid redundant calculations
  const uniqueMetricIds = Array.from(new Set(metricIds));
  
  // Calculate all metrics in parallel with error handling
  const promises = uniqueMetricIds.map(async (metricId) => {
    try {
      return await calculateMetric({
        organizationId,
        metricId,
        dateFrom,
        dateTo,
      });
    } catch (error) {
      // Log error but don't fail entire batch - return zero for failed metric
      logger.error(`Failed to calculate metric ${metricId}`, error as Error, { metricId });
      return {
        value: 0,
        metricId,
        calculatedAt: new Date(),
      };
    }
  });
  
  const results = await Promise.all(promises);
  
  // Convert to record
  const record: Record<string, number> = {};
  for (const result of results) {
    record[result.metricId] = result.value;
  }
  
  return record;
}
