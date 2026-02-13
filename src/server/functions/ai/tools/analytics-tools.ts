'use server'

/**
 * Analytics Agent Tools
 *
 * Tools for the analytics specialist agent to run reports and analyze data.
 * Implements AI-INFRA-014 acceptance criteria for analytics domain.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sql, and, gte, lte, eq, isNull, desc } from 'drizzle-orm';
import { orders, customers } from 'drizzle/schema';
import {
  type MetricsResult,
  type TrendsResult,
  createErrorResult,
} from '@/lib/ai/tools/types';
import {
  formatAsTable,
  formatCurrency as formatCurrencyHelper,
  formatNumber,
  formatPercent,
  formatStatus,
} from '@/lib/ai/tools/formatters';
import { type ToolExecutionContext } from '@/lib/ai/context/types';
import { logger } from '@/lib/logger';

// ============================================================================
// PERIOD HELPERS
// ============================================================================

type PeriodType = 'mtd' | 'qtd' | 'ytd' | 'rolling30' | 'rolling60' | 'rolling90' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

function getDateRange(period: PeriodType, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'mtd': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: today, label: 'Month to Date' };
    }
    case 'qtd': {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      return { start, end: today, label: 'Quarter to Date' };
    }
    case 'ytd': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: today, label: 'Year to Date' };
    }
    case 'rolling30': {
      const start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start, end: today, label: 'Last 30 Days' };
    }
    case 'rolling60': {
      const start = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
      return { start, end: today, label: 'Last 60 Days' };
    }
    case 'rolling90': {
      const start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { start, end: today, label: 'Last 90 Days' };
    }
    case 'custom': {
      const start = customStart ? new Date(customStart) : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const end = customEnd ? new Date(customEnd) : today;
      return { start, end, label: `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}` };
    }
    default:
      return getDateRange('mtd');
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================================
// RUN REPORT TOOL
// ============================================================================

/**
 * Run a predefined report.
 * Yields formatted markdown table for better UX.
 */
export const runReportTool = tool({
  description:
    'Run a predefined business report. ' +
    'Available reports: revenue_by_customer, revenue_by_product, orders_by_status, pipeline_summary. ' +
    'Returns data with summaries for the specified time period.',
  inputSchema: z.object({
    reportType: z
      .enum(['revenue_by_customer', 'revenue_by_product', 'orders_by_status', 'pipeline_summary'])
      .describe('Type of report to run'),
    period: z
      .enum(['mtd', 'qtd', 'ytd', 'rolling30', 'rolling60', 'rolling90', 'custom'])
      .default('mtd')
      .describe('Time period for the report'),
    customStartDate: z
      .string()
      .optional()
      .describe('Start date for custom period (ISO format YYYY-MM-DD)'),
    customEndDate: z
      .string()
      .optional()
      .describe('End date for custom period (ISO format YYYY-MM-DD)'),
    limit: z
      .number()
      .int()
      .min(5)
      .max(100)
      .default(20)
      .describe('Maximum rows to return'),
  }),
  execute: async function* (
    { reportType, period, customStartDate, customEndDate, limit },
    { experimental_context }
  ) {
    const ctx = experimental_context as ToolExecutionContext | undefined;

    if (!ctx?.organizationId) {
      yield {
        text: 'Organization context missing. Unable to process request.',
      };
      return;
    }

    try {
      const dateRange = getDateRange(period, customStartDate, customEndDate);
      const periodHeader = `**${dateRange.label}** (${dateRange.start.toISOString().slice(0, 10)} to ${dateRange.end.toISOString().slice(0, 10)})`;

      switch (reportType) {
        case 'revenue_by_customer': {
          const results = await db
            .select({
              customerId: orders.customerId,
              customerName: customers.name,
              orderCount: sql<number>`count(*)::int`,
              totalRevenue: sql<number>`sum(${orders.total})::numeric`,
              avgOrderValue: sql<number>`avg(${orders.total})::numeric`,
            })
            .from(orders)
            .leftJoin(customers, eq(orders.customerId, customers.id))
            .where(
              and(
                eq(orders.organizationId, ctx.organizationId),
                isNull(orders.deletedAt),
                sql`${orders.status} NOT IN ('draft', 'cancelled')`,
                gte(orders.orderDate, dateRange.start.toISOString().slice(0, 10)),
                lte(orders.orderDate, dateRange.end.toISOString().slice(0, 10))
              )
            )
            .groupBy(orders.customerId, customers.name)
            .orderBy(desc(sql`sum(${orders.total})`))
            .limit(limit);

          if (results.length === 0) {
            yield {
              text: `## Revenue by Customer\n\n${periodHeader}\n\nNo revenue data found for this period.`,
            };
            return;
          }

          const totalRevenue = results.reduce((sum, r) => sum + (Number(r.totalRevenue) || 0), 0);

          // Format as table
          const tableData = results.map((r) => ({
            customerName: r.customerName || 'Unknown',
            orderCount: r.orderCount,
            totalRevenue: Number(r.totalRevenue) || 0,
            avgOrderValue: Number(r.avgOrderValue) || 0,
          }));

          const table = formatAsTable(tableData, [
            { key: 'customerName', header: 'Customer' },
            { key: 'orderCount', header: 'Orders', format: (v) => formatNumber(v as number) },
            { key: 'totalRevenue', header: 'Revenue', format: (v) => formatCurrencyHelper(v as number) },
            { key: 'avgOrderValue', header: 'Avg Order', format: (v) => formatCurrencyHelper(v as number) },
          ]);

          yield {
            text: `## Revenue by Customer\n\n${periodHeader}\n\n${table}\n\n**Total Revenue:** ${formatCurrency(totalRevenue)} | **${results.length} customers**`,
          };
          return;
        }

        case 'orders_by_status': {
          const results = await db
            .select({
              status: orders.status,
              count: sql<number>`count(*)::int`,
              totalValue: sql<number>`sum(${orders.total})::numeric`,
            })
            .from(orders)
            .where(
              and(
                eq(orders.organizationId, ctx.organizationId),
                isNull(orders.deletedAt),
                gte(orders.orderDate, dateRange.start.toISOString().slice(0, 10)),
                lte(orders.orderDate, dateRange.end.toISOString().slice(0, 10))
              )
            )
            .groupBy(orders.status);

          if (results.length === 0) {
            yield {
              text: `## Orders by Status\n\n${periodHeader}\n\nNo orders found for this period.`,
            };
            return;
          }

          const totalOrders = results.reduce((sum, r) => sum + r.count, 0);
          const totalValue = results.reduce((sum, r) => sum + (Number(r.totalValue) || 0), 0);

          // Format as table
          const tableData = results.map((r) => ({
            status: r.status,
            count: r.count,
            totalValue: Number(r.totalValue) || 0,
            percentage: totalOrders > 0 ? (r.count / totalOrders) * 100 : 0,
          }));

          const table = formatAsTable(tableData, [
            { key: 'status', header: 'Status', format: (v) => formatStatus(v as string) },
            { key: 'count', header: 'Count', format: (v) => formatNumber(v as number) },
            { key: 'totalValue', header: 'Value', format: (v) => formatCurrencyHelper(v as number) },
            { key: 'percentage', header: '%', format: (v) => formatPercent(v as number) },
          ]);

          yield {
            text: `## Orders by Status\n\n${periodHeader}\n\n${table}\n\n**Total Orders:** ${formatNumber(totalOrders)} | **Total Value:** ${formatCurrency(totalValue)}`,
          };
          return;
        }

        case 'pipeline_summary': {
          const results = await db
            .select({
              status: orders.status,
              count: sql<number>`count(*)::int`,
              totalValue: sql<number>`sum(${orders.total})::numeric`,
            })
            .from(orders)
            .where(
              and(
                eq(orders.organizationId, ctx.organizationId),
                isNull(orders.deletedAt),
                sql`${orders.status} IN ('draft', 'confirmed', 'picking')`,
                gte(orders.orderDate, dateRange.start.toISOString().slice(0, 10)),
                lte(orders.orderDate, dateRange.end.toISOString().slice(0, 10))
              )
            )
            .groupBy(orders.status);

          if (results.length === 0) {
            yield {
              text: `## Pipeline Summary\n\n${periodHeader}\n\nNo orders in pipeline for this period.`,
            };
            return;
          }

          const pipelineValue = results.reduce((sum, r) => sum + (Number(r.totalValue) || 0), 0);
          const pipelineCount = results.reduce((sum, r) => sum + r.count, 0);

          // Format as table
          const tableData = results.map((r) => ({
            stage: r.status,
            count: r.count,
            value: Number(r.totalValue) || 0,
          }));

          const table = formatAsTable(tableData, [
            { key: 'stage', header: 'Stage', format: (v) => formatStatus(v as string) },
            { key: 'count', header: 'Orders', format: (v) => formatNumber(v as number) },
            { key: 'value', header: 'Value', format: (v) => formatCurrencyHelper(v as number) },
          ]);

          yield {
            text: `## Pipeline Summary\n\n${periodHeader}\n\n${table}\n\n**Pipeline Total:** ${formatCurrency(pipelineValue)} | **${formatNumber(pipelineCount)} orders**`,
          };
          return;
        }

        default:
          yield {
            text: `Report type "${reportType}" is not yet implemented. Try one of: revenue_by_customer, orders_by_status, pipeline_summary`,
          };
          return;
      }
    } catch (error) {
      logger.error('Error in runReportTool', error as Error, {});
      yield {
        text: `Failed to run report: ${error instanceof Error ? error.message : 'Unknown error'}. Check the parameters and try again.`,
      };
    }
  },
});

// ============================================================================
// GET METRICS TOOL
// ============================================================================

/**
 * Get a specific business metric with comparison.
 */
export const getMetricsTool = tool({
  description:
    'Get a specific business metric with comparison to the previous period. ' +
    'Available metrics: total_revenue, order_count, average_order_value, customer_count. ' +
    'Shows the current value, previous period value, and percentage change.',
  inputSchema: z.object({
    metric: z
      .enum(['total_revenue', 'order_count', 'average_order_value', 'customer_count'])
      .describe('The metric to retrieve'),
    period: z
      .enum(['mtd', 'qtd', 'ytd', 'rolling30', 'rolling60', 'rolling90'])
      .default('mtd')
      .describe('Time period for the metric'),
  }),
  execute: async (
    { metric, period },
    { experimental_context }
  ): Promise<MetricsResult | ReturnType<typeof createErrorResult>> => {
    const ctx = experimental_context as ToolExecutionContext | undefined;

    if (!ctx?.organizationId) {
      return createErrorResult(
        'Organization context missing',
        'Unable to process request without organization context',
        'CONTEXT_ERROR'
      );
    }

    try {
      const currentRange = getDateRange(period);
      const periodLength = currentRange.end.getTime() - currentRange.start.getTime();
      const prevStart = new Date(currentRange.start.getTime() - periodLength);
      const prevEnd = new Date(currentRange.end.getTime() - periodLength);

      const baseConditions = [
        eq(orders.organizationId, ctx.organizationId),
        isNull(orders.deletedAt),
        sql`${orders.status} NOT IN ('draft', 'cancelled')`,
      ];

      let currentValue = 0;
      let previousValue = 0;

      switch (metric) {
        case 'total_revenue': {
          const [[current], [previous]] = await Promise.all([
            db
              .select({ value: sql<number>`coalesce(sum(${orders.total}), 0)::numeric` })
              .from(orders)
              .where(and(...baseConditions, gte(orders.orderDate, currentRange.start.toISOString().slice(0, 10)), lte(orders.orderDate, currentRange.end.toISOString().slice(0, 10)))),
            db
              .select({ value: sql<number>`coalesce(sum(${orders.total}), 0)::numeric` })
              .from(orders)
              .where(and(...baseConditions, gte(orders.orderDate, prevStart.toISOString().slice(0, 10)), lte(orders.orderDate, prevEnd.toISOString().slice(0, 10)))),
          ]);

          currentValue = Number(current?.value) || 0;
          previousValue = Number(previous?.value) || 0;
          break;
        }

        case 'order_count': {
          const [[current], [previous]] = await Promise.all([
            db
              .select({ value: sql<number>`count(*)::int` })
              .from(orders)
              .where(and(...baseConditions, gte(orders.orderDate, currentRange.start.toISOString().slice(0, 10)), lte(orders.orderDate, currentRange.end.toISOString().slice(0, 10)))),
            db
              .select({ value: sql<number>`count(*)::int` })
              .from(orders)
              .where(and(...baseConditions, gte(orders.orderDate, prevStart.toISOString().slice(0, 10)), lte(orders.orderDate, prevEnd.toISOString().slice(0, 10)))),
          ]);

          currentValue = current?.value || 0;
          previousValue = previous?.value || 0;
          break;
        }

        case 'average_order_value': {
          const [[current], [previous]] = await Promise.all([
            db
              .select({ value: sql<number>`coalesce(avg(${orders.total}), 0)::numeric` })
              .from(orders)
              .where(and(...baseConditions, gte(orders.orderDate, currentRange.start.toISOString().slice(0, 10)), lte(orders.orderDate, currentRange.end.toISOString().slice(0, 10)))),
            db
              .select({ value: sql<number>`coalesce(avg(${orders.total}), 0)::numeric` })
              .from(orders)
              .where(and(...baseConditions, gte(orders.orderDate, prevStart.toISOString().slice(0, 10)), lte(orders.orderDate, prevEnd.toISOString().slice(0, 10)))),
          ]);

          currentValue = Number(current?.value) || 0;
          previousValue = Number(previous?.value) || 0;
          break;
        }

        case 'customer_count': {
          const [[current], [previous]] = await Promise.all([
            db
              .select({ value: sql<number>`count(distinct ${orders.customerId})::int` })
              .from(orders)
              .where(and(...baseConditions, gte(orders.orderDate, currentRange.start.toISOString().slice(0, 10)), lte(orders.orderDate, currentRange.end.toISOString().slice(0, 10)))),
            db
              .select({ value: sql<number>`count(distinct ${orders.customerId})::int` })
              .from(orders)
              .where(and(...baseConditions, gte(orders.orderDate, prevStart.toISOString().slice(0, 10)), lte(orders.orderDate, prevEnd.toISOString().slice(0, 10)))),
          ]);

          currentValue = current?.value || 0;
          previousValue = previous?.value || 0;
          break;
        }
      }

      const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
      const isMonetary = metric === 'total_revenue' || metric === 'average_order_value';

      return {
        value: currentValue,
        previousValue,
        change,
        trend: change > 1 ? 'up' : change < -1 ? 'down' : 'flat',
        formatted: isMonetary ? formatCurrency(currentValue) : currentValue.toLocaleString(),
      };
    } catch (error) {
      logger.error('Error in getMetricsTool', error as Error, {});
      return createErrorResult('Failed to retrieve metric', 'Check the parameters and try again', 'INTERNAL_ERROR');
    }
  },
});

// ============================================================================
// GET TRENDS TOOL
// ============================================================================

/**
 * Get trend data for a metric over time.
 */
export const getTrendsTool = tool({
  description:
    'Get trend data showing how a metric changes over time. ' +
    'Returns daily data points for the specified period. ' +
    'Use this when the user asks about trends, patterns, or historical performance.',
  inputSchema: z.object({
    metric: z
      .enum(['revenue', 'orders', 'customers'])
      .describe('The metric to track over time'),
    period: z
      .enum(['rolling30', 'rolling60', 'rolling90'])
      .default('rolling30')
      .describe('Time period to analyze'),
    granularity: z
      .enum(['daily', 'weekly'])
      .default('daily')
      .describe('Data point granularity'),
  }),
  execute: async (
    { metric, period, granularity },
    { experimental_context }
  ): Promise<TrendsResult | ReturnType<typeof createErrorResult>> => {
    const ctx = experimental_context as ToolExecutionContext | undefined;

    if (!ctx?.organizationId) {
      return createErrorResult(
        'Organization context missing',
        'Unable to process request without organization context',
        'CONTEXT_ERROR'
      );
    }

    try {
      const dateRange = getDateRange(period);
      const isWeekly = granularity === 'weekly';

      const baseConditions = [
        eq(orders.organizationId, ctx.organizationId),
        isNull(orders.deletedAt),
        sql`${orders.status} NOT IN ('draft', 'cancelled')`,
        gte(orders.orderDate, dateRange.start.toISOString().slice(0, 10)),
        lte(orders.orderDate, dateRange.end.toISOString().slice(0, 10)),
      ];

      let valueColumn: ReturnType<typeof sql>;
      switch (metric) {
        case 'revenue':
          valueColumn = sql<number>`coalesce(sum(${orders.total}), 0)::numeric`;
          break;
        case 'orders':
          valueColumn = sql<number>`count(*)::int`;
          break;
        case 'customers':
          valueColumn = sql<number>`count(distinct ${orders.customerId})::int`;
          break;
        default:
          return createErrorResult(`Metric "${metric}" is not recognized`, 'Try one of: revenue, orders, customers', 'INVALID_METRIC');
      }

      const dateGroup = isWeekly
        ? sql<string>`date_trunc('week', ${orders.orderDate}::date)::date`
        : sql<string>`${orders.orderDate}`;

      const results = await db
        .select({ date: dateGroup, value: valueColumn })
        .from(orders)
        .where(and(...baseConditions))
        .groupBy(dateGroup)
        .orderBy(dateGroup);

      const dataPoints = results.map((r) => ({
        date: r.date?.toString() || '',
        value: Number(r.value) || 0,
      }));

      const values = dataPoints.map((d) => d.value);
      const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const min = values.length > 0 ? Math.min(...values) : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;

      let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (values.length >= 3) {
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const changePercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
        if (changePercent > 5) direction = 'increasing';
        else if (changePercent < -5) direction = 'decreasing';
      }

      return { dataPoints, direction, average, range: { min, max } };
    } catch (error) {
      logger.error('Error in getTrendsTool', error as Error, {});
      return createErrorResult('Failed to retrieve trend data', 'Check the parameters and try again', 'INTERNAL_ERROR');
    }
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export const analyticsTools = {
  run_report: runReportTool,
  get_metrics: getMetricsTool,
  get_trends: getTrendsTool,
} as const;

export type AnalyticsTools = typeof analyticsTools;
