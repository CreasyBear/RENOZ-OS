/**
 * Customer Analytics Server Functions
 *
 * Aggregate queries for customer analytics, reporting, and dashboards.
 * These functions compute KPIs, trends, and distributions from customer data.
 *
 * ARCHITECTURE: Routes fetch this data and pass to presentational components.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { sql, eq, and, gte, lte, count, ne, inArray, sum, avg, isNull, notInArray } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/lib/db';
import { customers, customerTags, customerTagAssignments, orders, customerActivities } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError } from '@/lib/server/errors';

// ============================================================================
// SCHEMAS
// ============================================================================

export const dateRangeSchema = z.object({
  range: z.enum(['7d', '30d', '90d', '365d', 'all']).default('30d'),
});

export const segmentAnalyticsSchema = z.object({
  segmentId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
});

export const valueRangeSchema = z.object({
  range: z.enum(['3m', '6m', '1y']).default('6m'),
});

export const lifecycleRangeSchema = z.object({
  range: z.enum(['3m', '6m', '1y']).default('6m'),
});

// ============================================================================
// DASHBOARD KPIs
// ============================================================================

/**
 * Get key performance indicators for customer dashboard
 *
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getCustomerKpis = cache(async (data: { range: string }, organizationId: string) => {
  const { range } = data;
  const now = new Date();
  const startDate = getStartDate(range, now);
  const previousStartDate = getPreviousStartDate(range, startDate);

  // Build order conditions for valid orders
  const validOrderCondition = and(
    eq(orders.organizationId, organizationId),
    isNull(orders.deletedAt),
    notInArray(orders.status, ['draft', 'cancelled'])
  );

  const currentCustomerCondition = and(
    eq(customers.organizationId, organizationId),
    isNull(customers.deletedAt),
    startDate ? gte(customers.createdAt, startDate) : sql`1=1`
  );

  const previousCustomerCondition = and(
    eq(customers.organizationId, organizationId),
    isNull(customers.deletedAt),
    previousStartDate ? gte(customers.createdAt, previousStartDate) : sql`1=1`,
    startDate ? lte(customers.createdAt, startDate) : sql`1=1`
  );

  // RAW SQL (Phase 11 Keep): count(CASE WHEN) for conditional counts. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
  const [currentMetrics, previousMetrics, currentRevenue, previousRevenue] = await Promise.all([
    // Current period customer metrics
    db
      .select({
        totalCustomers: count(),
        activeCustomers: count(sql`CASE WHEN ${customers.status} = 'active' THEN 1 END`),
      })
      .from(customers)
      .where(currentCustomerCondition),
    // Previous period customer metrics
    db
      .select({
        totalCustomers: count(),
      })
      .from(customers)
      .where(previousCustomerCondition),
    // Current period revenue from orders - aggregate directly from orders joined with customers
    // Note: avgLifetimeValue will be calculated as totalRevenue / totalCustomers
    db
      .select({
        totalRevenue: sum(orders.total),
      })
      .from(orders)
      .innerJoin(
        customers,
        and(
          eq(orders.customerId, customers.id),
          currentCustomerCondition
        )
      )
      .where(validOrderCondition),
    // Previous period revenue from orders
    db
      .select({
        totalRevenue: sum(orders.total),
      })
      .from(orders)
      .innerJoin(
        customers,
        and(
          eq(orders.customerId, customers.id),
          previousCustomerCondition
        )
      )
      .where(validOrderCondition),
  ]);

  const current = currentMetrics[0];
  const previous = previousMetrics[0];
  const currentRev = currentRevenue[0] ?? { totalRevenue: null };
  const previousRev = previousRevenue[0] ?? { totalRevenue: null };
  
  // Calculate average LTV: total revenue / number of customers (including those with 0 orders)
  // Handle nulls from sum() aggregation (returns null when no rows match)
  const totalCustomers = Number(current?.totalCustomers ?? 0);
  const currentRevenueValue = Number(currentRev?.totalRevenue ?? 0);
  const avgLifetimeValue = totalCustomers > 0 
    ? currentRevenueValue / totalCustomers 
    : 0;

  // Calculate changes (handle nulls from sum() aggregation)
  const previousRevenueValue = Number(previousRev?.totalRevenue ?? 0);
  const customerChange = calculatePercentChange(
    Number(current?.totalCustomers ?? 0),
    Number(previous?.totalCustomers ?? 0)
  );
  const revenueChange = calculatePercentChange(
    currentRevenueValue,
    previousRevenueValue
  );

  return {
    kpis: [
      {
        label: 'Total Customers',
        value: formatNumber(Number(current?.totalCustomers ?? 0)),
        change: customerChange,
        changeLabel: `vs previous ${range}`,
        icon: 'users',
      },
      {
        label: 'Total Revenue',
        value: formatCurrency(currentRevenueValue),
        change: revenueChange,
        changeLabel: `vs previous ${range}`,
        icon: 'dollar',
      },
      {
        label: 'Average LTV',
        value: formatCurrency(avgLifetimeValue),
        change: 0, // Would need historical avg
        changeLabel: 'lifetime',
        icon: 'trending',
      },
      {
        label: 'Active Rate',
        value: `${Math.round((Number(current?.activeCustomers ?? 0) / Math.max(Number(current?.totalCustomers ?? 1), 1)) * 100)}%`,
        change: 0,
        changeLabel: 'of total',
        icon: 'check',
      },
    ],
  };
});

export const getCustomerKpis = createServerFn({ method: 'GET' })
  .inputValidator(dateRangeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    return _getCustomerKpis(data, ctx.organizationId);
  });

// ============================================================================
// HEALTH DISTRIBUTION
// ============================================================================

/**
 * Get customer health score distribution
 */
export const getHealthDistribution = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const distribution = await db
      .select({
        excellent: count(sql`CASE WHEN ${customers.healthScore} >= 80 THEN 1 END`),
        good: count(
          sql`CASE WHEN ${customers.healthScore} >= 60 AND ${customers.healthScore} < 80 THEN 1 END`
        ),
        fair: count(
          sql`CASE WHEN ${customers.healthScore} >= 40 AND ${customers.healthScore} < 60 THEN 1 END`
        ),
        atRisk: count(sql`CASE WHEN ${customers.healthScore} < 40 THEN 1 END`),
        total: count(),
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt),
          sql`${customers.healthScore} IS NOT NULL`
        )
      );

    const d = distribution[0];
    const total = Number(d?.total ?? 1);

    return {
      distribution: {
        excellent: Math.round((Number(d?.excellent ?? 0) / total) * 100),
        good: Math.round((Number(d?.good ?? 0) / total) * 100),
        fair: Math.round((Number(d?.fair ?? 0) / total) * 100),
        atRisk: Math.round((Number(d?.atRisk ?? 0) / total) * 100),
      },
      counts: {
        excellent: Number(d?.excellent ?? 0),
        good: Number(d?.good ?? 0),
        fair: Number(d?.fair ?? 0),
        atRisk: Number(d?.atRisk ?? 0),
        total,
      },
    };
  });

// ============================================================================
// CUSTOMER TRENDS
// ============================================================================

/**
 * Get customer count trends over time
 */
export const getCustomerTrends = createServerFn({ method: 'GET' })
  .inputValidator(dateRangeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { range } = data;
    const intervals = getIntervals(range);

    // Build order aggregation conditions
    const validOrderCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      notInArray(orders.status, ['draft', 'cancelled'])
    );

    // Aggregate customer counts and revenue by period in SQL using DATE_TRUNC
    // This avoids fetching all rows and grouping in JavaScript
    const DATE_TRUNC_INTERVALS = {
      day: sql`'day'`,
      week: sql`'week'`,
      month: sql`'month'`,
    } as const;
    const truncateExpr =
      DATE_TRUNC_INTERVALS[intervals.truncate as keyof typeof DATE_TRUNC_INTERVALS] ?? sql`'month'`;
    const trendsData = await db
      .select({
        period: sql<string>`DATE_TRUNC(${truncateExpr}, ${customers.createdAt})::text`.as('period'),
        customer_count: sql<number>`COUNT(DISTINCT ${customers.id})::int`.as('customer_count'),
        revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`.as('revenue'),
      })
      .from(customers)
      .leftJoin(
        orders,
        and(
          eq(orders.customerId, customers.id),
          validOrderCondition
        )
      )
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt),
          gte(customers.createdAt, intervals.startDate)
        )
      )
      .groupBy(sql`DATE_TRUNC(${truncateExpr}, ${customers.createdAt})`)
      .orderBy(sql`DATE_TRUNC(${truncateExpr}, ${customers.createdAt})`);

    return {
      customerTrend: trendsData.map((row) => ({
        period: row.period,
        value: Number(row.customer_count),
      })),
      revenueTrend: trendsData.map((row) => ({
        period: row.period,
        value: Number(row.revenue),
      })),
    };
  });

// ============================================================================
// SEGMENT/TAG ANALYTICS
// ============================================================================

/**
 * Get segment (tag) performance metrics
 */
export const getSegmentPerformance = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    // Build order aggregation conditions
    const validOrderCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      notInArray(orders.status, ['draft', 'cancelled'])
    );

    // Get metrics per tag (segment) with revenue aggregated from orders
    const segments = await db
      .select({
        id: customerTags.id,
        name: customerTags.name,
        customerCount: sql<number>`COUNT(DISTINCT ${customers.id})::int`,
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
        avgHealthScore: sql<number>`COALESCE(AVG(${customers.healthScore}), 0)::numeric`,
      })
      .from(customerTags)
      .leftJoin(
        customerTagAssignments,
        eq(customerTagAssignments.tagId, customerTags.id)
      )
      .leftJoin(
        customers,
        and(
          eq(customers.id, customerTagAssignments.customerId),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .leftJoin(
        orders,
        and(
          eq(orders.customerId, customers.id),
          validOrderCondition
        )
      )
      .where(eq(customerTags.organizationId, ctx.organizationId))
      .groupBy(customerTags.id, customerTags.name)
      .orderBy(sql`COALESCE(SUM(${orders.total}), 0) DESC`)
      .limit(10);

    return {
      segments: segments.map((row) => ({
        id: row.id,
        name: row.name,
        customers: Number(row.customerCount ?? 0),
        revenue: Number(row.totalRevenue ?? 0),
        healthScore: Math.round(Number(row.avgHealthScore ?? 0)),
        growth: 0, // Would need historical comparison
      })),
    };
  });

/**
 * Get analytics for a specific segment/tag
 */
export const getSegmentAnalytics = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tagId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const { tagId } = data;

    // Get tag info and metrics
    const tagResult = await db
      .select({
        id: customerTags.id,
        name: customerTags.name,
        description: customerTags.description,
      })
      .from(customerTags)
      .where(and(eq(customerTags.id, tagId), eq(customerTags.organizationId, ctx.organizationId)))
      .limit(1);

    if (!tagResult[0]) {
      throw new NotFoundError('Segment not found', 'customer_tag');
    }

    // Build order aggregation conditions
    const validOrderCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      notInArray(orders.status, ['draft', 'cancelled'])
    );

    // Get customer count and health metrics
    const [customerMetrics] = await db
      .select({
        customerCount: sql<number>`COUNT(DISTINCT ${customers.id})::int`,
        avgHealth: sql<number>`COALESCE(AVG(${customers.healthScore}), 0)::numeric`,
        excellentCount: sql<number>`COUNT(CASE WHEN ${customers.healthScore} >= 80 THEN 1 END)::int`,
        goodCount: sql<number>`COUNT(CASE WHEN ${customers.healthScore} >= 60 AND ${customers.healthScore} < 80 THEN 1 END)::int`,
        fairCount: sql<number>`COUNT(CASE WHEN ${customers.healthScore} >= 40 AND ${customers.healthScore} < 60 THEN 1 END)::int`,
        atRiskCount: sql<number>`COUNT(CASE WHEN ${customers.healthScore} < 40 THEN 1 END)::int`,
      })
      .from(customers)
      .innerJoin(
        customerTagAssignments,
        eq(customerTagAssignments.customerId, customers.id)
      )
      .where(
        and(
          eq(customerTagAssignments.tagId, tagId),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      );

    // Get revenue aggregated from orders for customers in this segment
    const customerIds = await db
      .select({ customerId: customers.id })
      .from(customers)
      .innerJoin(
        customerTagAssignments,
        eq(customerTagAssignments.customerId, customers.id)
      )
      .where(
        and(
          eq(customerTagAssignments.tagId, tagId),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      );

    const customerIdList = customerIds.map(c => c.customerId);
    const totalCustomers = Number(customerMetrics?.customerCount ?? 0);

    let totalValue = 0;
    let avgValue = 0;

    if (customerIdList.length > 0) {
      const [revenueMetrics] = await db
        .select({
          totalValue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
        })
        .from(orders)
        .where(
          and(
            validOrderCondition,
            inArray(orders.customerId, customerIdList)
          )
        );

      totalValue = Number(revenueMetrics?.totalValue ?? 0);
      avgValue = totalCustomers > 0 ? totalValue / totalCustomers : 0;
    }

    const metrics = [{
      customerCount: totalCustomers,
      totalValue,
      avgValue,
      avgHealth: Number(customerMetrics?.avgHealth ?? 0),
      excellentCount: Number(customerMetrics?.excellentCount ?? 0),
      goodCount: Number(customerMetrics?.goodCount ?? 0),
      fairCount: Number(customerMetrics?.fairCount ?? 0),
      atRiskCount: Number(customerMetrics?.atRiskCount ?? 0),
    }];

    const metricsData = metrics as unknown as {
      customer_count: number;
      total_value: number;
      avg_value: number;
      avg_health: number;
      excellent_count: number;
      good_count: number;
      fair_count: number;
      at_risk_count: number;
    }[];
    const m = metricsData[0];
    const total = Number(m?.customer_count ?? 1);

    return {
      segment: tagResult[0],
      metrics: {
        customerCount: Number(m?.customer_count ?? 0),
        totalValue: Number(m?.total_value ?? 0),
        avgValue: Number(m?.avg_value ?? 0),
        avgHealth: Math.round(Number(m?.avg_health ?? 0)),
      },
      healthDistribution: {
        excellent: Math.round((Number(m?.excellent_count ?? 0) / total) * 100),
        good: Math.round((Number(m?.good_count ?? 0) / total) * 100),
        fair: Math.round((Number(m?.fair_count ?? 0) / total) * 100),
        atRisk: Math.round((Number(m?.at_risk_count ?? 0) / total) * 100),
      },
    };
  });

// ============================================================================
// LIFECYCLE ANALYTICS
// ============================================================================

/**
 * Get customer lifecycle stage distribution
 */
export const getLifecycleStages = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    // Map status to lifecycle stages
    const stages = await db
      .select({
        status: customers.status,
        count: count(),
      })
      .from(customers)
      .where(
        and(eq(customers.organizationId, ctx.organizationId), isNull(customers.deletedAt))
      )
      .groupBy(customers.status);

    const total = stages.reduce((sum, s) => sum + Number(s.count), 0) || 1;

    // Map to UI-friendly format
    const stageMapping: Record<string, { name: string; color: string }> = {
      prospect: { name: 'Prospect', color: 'bg-blue-500' },
      active: { name: 'Active', color: 'bg-green-500' },
      inactive: { name: 'Inactive', color: 'bg-gray-500' },
      suspended: { name: 'Suspended', color: 'bg-red-500' },
    };

    return {
      stages: stages.map((s) => ({
        name: stageMapping[s.status]?.name ?? s.status,
        count: Number(s.count),
        percentage: Math.round((Number(s.count) / total) * 100 * 10) / 10,
        color: stageMapping[s.status]?.color ?? 'bg-gray-500',
      })),
    };
  });

// ============================================================================
// LIFECYCLE COHORT RETENTION
// ============================================================================

export const getLifecycleCohorts = createServerFn({ method: 'GET' })
  .inputValidator(lifecycleRangeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const startDate = getValueStartDate(data.range, new Date());
    const startDateString = startDate ? startDate.toISOString() : null;

    // Raw SQL justified: Complex COUNT(DISTINCT CASE WHEN ... OR ...) with interval expressions.
    // Drizzle ORM doesn't provide abstractions for retention cohort calculations.
    const cohorts = await db.execute<{
      period: string;
      customers: number;
      retained_30: number;
      retained_60: number;
      retained_90: number;
    }>(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', c.created_at), 'Mon YYYY') AS period,
        COUNT(*) AS customers,
        COUNT(DISTINCT CASE
          WHEN (
            (o.order_date IS NOT NULL AND o.order_date <= (c.created_at::date + interval '30 days') AND o.order_date >= c.created_at::date)
            OR (
              COALESCE(ca.completed_at, ca.created_at) IS NOT NULL
              AND COALESCE(ca.completed_at, ca.created_at)::timestamp BETWEEN c.created_at::timestamp AND c.created_at::timestamp + interval '30 days'
            )
          )
          THEN c.id
        END) AS retained_30,
        COUNT(DISTINCT CASE
          WHEN (
            (o.order_date IS NOT NULL AND o.order_date <= (c.created_at::date + interval '60 days') AND o.order_date >= c.created_at::date)
            OR (
              COALESCE(ca.completed_at, ca.created_at) IS NOT NULL
              AND COALESCE(ca.completed_at, ca.created_at)::timestamp BETWEEN c.created_at::timestamp AND c.created_at::timestamp + interval '60 days'
            )
          )
          THEN c.id
        END) AS retained_60,
        COUNT(DISTINCT CASE
          WHEN (
            (o.order_date IS NOT NULL AND o.order_date <= (c.created_at::date + interval '90 days') AND o.order_date >= c.created_at::date)
            OR (
              COALESCE(ca.completed_at, ca.created_at) IS NOT NULL
              AND COALESCE(ca.completed_at, ca.created_at)::timestamp BETWEEN c.created_at::timestamp AND c.created_at::timestamp + interval '90 days'
            )
          )
          THEN c.id
        END) AS retained_90
      FROM ${customers} c
      LEFT JOIN ${orders} o
        ON o.customer_id = c.id
        AND o.organization_id = ${ctx.organizationId}
        AND o.deleted_at IS NULL
        AND o.status NOT IN ('draft', 'cancelled')
      LEFT JOIN ${customerActivities} ca
        ON ca.customer_id = c.id
        AND ca.organization_id = ${ctx.organizationId}
      WHERE c.organization_id = ${ctx.organizationId}
        AND c.deleted_at IS NULL
        ${startDateString ? sql`AND c.created_at >= ${startDateString}` : sql``}
      GROUP BY DATE_TRUNC('month', c.created_at)
      ORDER BY DATE_TRUNC('month', c.created_at) DESC
      LIMIT 12
    `);

    const cohortRows = cohorts as unknown as {
      period: string;
      customers: number;
      retained_30: number;
      retained_60: number;
      retained_90: number;
    }[];

    return {
      cohorts: cohortRows.map((row) => {
        const total = Number(row.customers ?? 0) || 1;
        return {
          period: row.period,
          customers: Number(row.customers ?? 0),
          retention30: Math.round((Number(row.retained_30 ?? 0) / total) * 100),
          retention60: Math.round((Number(row.retained_60 ?? 0) / total) * 100),
          retention90: Math.round((Number(row.retained_90 ?? 0) / total) * 100),
        };
      }),
    };
  });

// ============================================================================
// CHURN METRICS
// ============================================================================

export const getChurnMetrics = createServerFn({ method: 'GET' })
  .inputValidator(lifecycleRangeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const startDate = getValueStartDate(data.range, new Date());
    const startDateString = startDate ? startDate.toISOString() : null;

    const churnedByMonth = await db.execute<{
      period: string;
      churned: number;
    }>(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', c.updated_at), 'Mon YYYY') AS period,
        COUNT(*) AS churned
      FROM ${customers} c
      WHERE c.organization_id = ${ctx.organizationId}
        AND c.deleted_at IS NULL
        AND c.status IN ('inactive', 'suspended', 'blacklisted')
        ${startDateString ? sql`AND c.updated_at >= ${startDateString}` : sql``}
      GROUP BY DATE_TRUNC('month', c.updated_at)
      ORDER BY DATE_TRUNC('month', c.updated_at) DESC
    `);

    const churnRows = churnedByMonth as unknown as {
      period: string;
      churned: number;
    }[];

    const [totalCustomers] = await db
      .select({ total: count() })
      .from(customers)
      .where(
        and(eq(customers.organizationId, ctx.organizationId), isNull(customers.deletedAt))
      );

    const total = Number(totalCustomers?.total ?? 0) || 1;
    const monthly = churnRows.map((row) => ({
      period: row.period,
      churned: Number(row.churned ?? 0),
      churnRate: Math.round((Number(row.churned ?? 0) / total) * 1000) / 10,
    }));

    const avgMonthlyRate =
      monthly.length > 0
        ? Math.round(
            (monthly.reduce((sum, row) => sum + row.churnRate, 0) / monthly.length) * 10
          ) / 10
        : 0;

    return {
      totalChurned: monthly.reduce((sum, row) => sum + row.churned, 0),
      avgMonthlyRate,
      monthly,
    };
  });

// ============================================================================
// CONVERSION FUNNEL
// ============================================================================

export const getConversionFunnel = createServerFn({ method: 'GET' })
  .inputValidator(lifecycleRangeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const startDate = getValueStartDate(data.range, new Date());
    const startDateString = startDate ? startDate.toISOString() : null;

    const [statusCounts] = await db
      .select({
        prospects: count(sql`CASE WHEN ${customers.status} = 'prospect' THEN 1 END`),
        active: count(sql`CASE WHEN ${customers.status} = 'active' THEN 1 END`),
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt),
          startDate ? gte(customers.createdAt, startDate) : sql`1=1`
        )
      );

    const orderCounts = await db.execute<{
      with_orders: number;
      repeat_customers: number;
    }>(sql`
      SELECT
        COUNT(*) FILTER (WHERE order_count >= 1) AS with_orders,
        COUNT(*) FILTER (WHERE order_count >= 2) AS repeat_customers
      FROM (
        SELECT o.customer_id, COUNT(*) AS order_count
        FROM ${orders} o
        WHERE o.organization_id = ${ctx.organizationId}
          AND o.deleted_at IS NULL
          AND o.status NOT IN ('draft', 'cancelled')
          ${startDateString ? sql`AND o.order_date >= ${startDateString}` : sql``}
        GROUP BY o.customer_id
      ) t
    `);

    const orderRow = orderCounts as unknown as {
      with_orders: number;
      repeat_customers: number;
    }[];

    const prospects = Number(statusCounts?.prospects ?? 0);
    const active = Number(statusCounts?.active ?? 0);
    const withOrders = Number(orderRow[0]?.with_orders ?? 0);
    const repeatCustomers = Number(orderRow[0]?.repeat_customers ?? 0);

    const steps = [
      { label: 'Prospects', count: prospects },
      { label: 'Active Customers', count: active },
      { label: 'Customers with Orders', count: withOrders },
      { label: 'Repeat Customers', count: repeatCustomers },
    ];

    return {
      steps: steps.map((step, index) => {
        if (index === 0) {
          return { ...step, rate: 100 };
        }
        const prev = steps[index - 1].count || 1;
        return { ...step, rate: Math.round((step.count / prev) * 100) };
      }),
    };
  });

// ============================================================================
// ACQUISITION METRICS
// ============================================================================

export const getAcquisitionMetrics = createServerFn({ method: 'GET' })
  .inputValidator(lifecycleRangeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const startDate = getValueStartDate(data.range, new Date());
    const startDateString = startDate ? startDate.toISOString() : null;

    const acquisition = await db.execute<{
      new_customers: number;
      activated_customers: number;
      avg_days: number;
    }>(sql`
      WITH first_orders AS (
        SELECT
          c.id,
          c.created_at,
          MIN(o.order_date) AS first_order_date
        FROM ${customers} c
        LEFT JOIN ${orders} o
          ON o.customer_id = c.id
          AND o.organization_id = ${ctx.organizationId}
          AND o.deleted_at IS NULL
          AND o.status NOT IN ('draft', 'cancelled')
        WHERE c.organization_id = ${ctx.organizationId}
          AND c.deleted_at IS NULL
          ${startDateString ? sql`AND c.created_at >= ${startDateString}` : sql``}
        GROUP BY c.id, c.created_at
      )
      SELECT
        COUNT(*) AS new_customers,
        COUNT(*) FILTER (WHERE first_order_date IS NOT NULL) AS activated_customers,
        COALESCE(AVG(EXTRACT(EPOCH FROM (first_order_date::timestamp - created_at)) / 86400), 0) AS avg_days
      FROM first_orders
    `);

    const row = acquisition as unknown as {
      new_customers: number;
      activated_customers: number;
      avg_days: number;
    }[];

    const newCustomers = Number(row[0]?.new_customers ?? 0);
    const activatedCustomers = Number(row[0]?.activated_customers ?? 0);

    return {
      newCustomers,
      activationRate: newCustomers > 0 ? (activatedCustomers / newCustomers) * 100 : 0,
      avgTimeToFirstOrderDays: Math.round(Number(row[0]?.avg_days ?? 0) * 10) / 10,
      avgAcquisitionCost: null,
    };
  });

// ============================================================================
// QUICK STATS
// ============================================================================

/**
 * Get quick stats for the customer analytics dashboard.
 */
export const getQuickStats = createServerFn({ method: 'GET' })
  .inputValidator(dateRangeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const now = new Date();
    const startDate = getStartDate(data.range, now);
    const startDateString = startDate ? startDate.toISOString().split('T')[0] : null;

    const [newCustomers] = await db
      .select({
        count: count(),
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt),
          startDate ? gte(customers.createdAt, startDate) : sql`1=1`
        )
      );

    const [churnedCustomers] = await db
      .select({
        count: count(),
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt),
          sql`${customers.status} IN ('inactive', 'suspended', 'blacklisted')`,
          startDate ? gte(customers.updatedAt, startDate) : sql`1=1`
        )
      );

    const [orderStats] = await db
      .select({
        avgOrderValue: sql<number>`COALESCE(AVG(${orders.total}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          ne(orders.status, 'draft'),
          ne(orders.status, 'cancelled'),
          startDateString ? gte(orders.orderDate, startDateString) : sql`1=1`
        )
      );

    const repeatRateResult = await db.execute<{
      repeat_customers: number;
      total_customers: number;
    }>(sql`
      SELECT
        COUNT(*) FILTER (WHERE order_count > 1) AS repeat_customers,
        COUNT(*) AS total_customers
      FROM (
        SELECT o.customer_id, COUNT(*) AS order_count
        FROM ${orders} o
        WHERE o.organization_id = ${ctx.organizationId}
          AND o.deleted_at IS NULL
          AND o.status NOT IN ('draft', 'cancelled')
          ${startDateString ? sql`AND o.order_date >= ${startDateString}` : sql``}
        GROUP BY o.customer_id
      ) t
    `);

    const repeatRow = repeatRateResult as unknown as {
      repeat_customers: number;
      total_customers: number;
    }[];
    const repeatCustomers = Number(repeatRow[0]?.repeat_customers ?? 0);
    const totalCustomers = Number(repeatRow[0]?.total_customers ?? 0);

    return {
      newCustomers: Number(newCustomers?.count ?? 0),
      churnedCustomers: Number(churnedCustomers?.count ?? 0),
      avgOrderValue: Number(orderStats?.avgOrderValue ?? 0),
      repeatRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0,
    };
  });

// ============================================================================
// VALUE KPIS
// ============================================================================

/**
 * Get value KPIs for customer value analysis.
 */
export const getValueKpis = createServerFn({ method: 'GET' })
  .inputValidator(valueRangeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const now = new Date();
    const startDate = getValueStartDate(data.range, now);
    const startDateString = startDate ? startDate.toISOString().split('T')[0] : null;

    // Get customer count for the period
    const [customerCountResult] = await db
      .select({
        customerCount: count(),
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt),
          startDate ? gte(customers.createdAt, startDate) : sql`1=1`
        )
      );

    // Get order metrics aggregated from orders table
    const orderMetrics = await db
      .select({
        totalRevenue: sum(orders.total),
        avgOrderValue: avg(orders.total),
        orderCount: count(),
        // COUNT(DISTINCT) requires raw SQL as Drizzle doesn't have distinct count function
        customerCount: sql<number>`COUNT(DISTINCT ${orders.customerId})::int`,
      })
      .from(orders)
      .innerJoin(
        customers,
        and(
          eq(orders.customerId, customers.id),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt),
          startDate ? gte(customers.createdAt, startDate) : sql`1=1`
        )
      )
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          notInArray(orders.status, ['draft', 'cancelled']),
          startDateString ? gte(orders.orderDate, startDateString) : sql`1=1`
        )
      );

    const orderStatsRow = orderMetrics[0];
    const orderStats = {
      totalRevenue: Number(orderStatsRow?.totalRevenue ?? 0),
      avgOrderValue: Number(orderStatsRow?.avgOrderValue ?? 0),
      orderCount: Number(orderStatsRow?.orderCount ?? 0),
      customerCount: Number(orderStatsRow?.customerCount ?? 0),
    };

    const totalCustomers = Number(customerCountResult?.customerCount ?? 0);
    const orderCount = Number(orderStats.orderCount ?? 0);
    const customerCountWithOrders = Number(orderStats.customerCount ?? 0);

    // Calculate average LTV: total revenue / total customers (including those with 0 orders)
    const avgLifetimeValue = totalCustomers > 0 
      ? Number(orderStats.totalRevenue ?? 0) / totalCustomers 
      : 0;

    return {
      avgLifetimeValue,
      totalRevenue: Number(orderStats.totalRevenue ?? 0),
      avgOrderValue: Number(orderStats.avgOrderValue ?? 0),
      ordersPerCustomer: customerCountWithOrders > 0 ? orderCount / customerCountWithOrders : 0,
    };
  });

/**
 * Get value tier distribution (Platinum, Gold, Silver, Bronze)
 */
export const getValueTiers = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    // Get customer revenues aggregated from orders, then group by tier
    const customerRevenues = await db
      .select({
        customerId: customers.id,
        revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
      })
      .from(customers)
      .leftJoin(
        orders,
        and(
          eq(orders.customerId, customers.id),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          notInArray(orders.status, ['draft', 'cancelled'])
        )
      )
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .groupBy(customers.id)
      .limit(5000); // Cap for large orgs; tier distribution may be partial above this

    // Group by tier thresholds
    const tierGroups = customerRevenues.reduce((acc, cr) => {
      const revenue = Number(cr.revenue ?? 0);
      let tier: string;
      if (revenue >= 100000) tier = 'Platinum';
      else if (revenue >= 50000) tier = 'Gold';
      else if (revenue >= 10000) tier = 'Silver';
      else tier = 'Bronze';

      if (!acc[tier]) {
        acc[tier] = { customer_count: 0, total_revenue: 0 };
      }
      acc[tier].customer_count += 1;
      acc[tier].total_revenue += revenue;
      return acc;
    }, {} as Record<string, { customer_count: number; total_revenue: number }>);

    const tiers = Object.entries(tierGroups).map(([tier, data]) => ({
      tier,
      customer_count: data.customer_count,
      total_revenue: data.total_revenue,
      avg_value: data.customer_count > 0 ? data.total_revenue / data.customer_count : 0,
    })).sort((a, b) => b.avg_value - a.avg_value);

    const total = tiers.reduce((sum, t) => sum + t.customer_count, 0) || 1;

    const tierColors: Record<string, string> = {
      Platinum: 'bg-purple-500',
      Gold: 'bg-yellow-500',
      Silver: 'bg-gray-400',
      Bronze: 'bg-orange-700',
    };

    return {
      tiers: tiers.map((t) => ({
        name: t.tier,
        customers: t.customer_count,
        percentage: Math.round((t.customer_count / total) * 100 * 10) / 10,
        revenue: t.total_revenue,
        avgValue: Math.round(t.avg_value),
        color: tierColors[t.tier] ?? 'bg-gray-500',
      })),
    };
  });

/**
 * Get top customers by lifetime value
 */
export const getTopCustomers = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ limit: z.number().min(1).max(50).default(10) }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    // Build order aggregation conditions
    const validOrderCondition = and(
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      notInArray(orders.status, ['draft', 'cancelled'])
    );

    const topCustomers = await db
      .select({
        id: customers.id,
        name: customers.name,
        customerCode: customers.customerCode,
        lifetimeValue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
        totalOrders: sql<number>`COUNT(${orders.id})::int`,
        healthScore: customers.healthScore,
        status: customers.status,
      })
      .from(customers)
      .leftJoin(
        orders,
        and(
          eq(orders.customerId, customers.id),
          validOrderCondition
        )
      )
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .groupBy(
        customers.id,
        customers.name,
        customers.customerCode,
        customers.healthScore,
        customers.status
      )
      .orderBy(sql`COALESCE(SUM(${orders.total}), 0) DESC`)
      .limit(data.limit);

    return {
      customers: topCustomers.map((c, idx) => ({
        rank: idx + 1,
        id: c.id,
        name: c.name,
        code: c.customerCode,
        ltv: Number(c.lifetimeValue ?? 0),
        orders: Number(c.totalOrders ?? 0),
        avgOrder:
          Number(c.totalOrders ?? 0) > 0
            ? Math.round(Number(c.lifetimeValue ?? 0) / Number(c.totalOrders))
            : 0,
        healthScore: c.healthScore,
        status: c.status,
      })),
    };
  });

// ============================================================================
// PROFITABILITY SEGMENTS (REVENUE-BASED)
// ============================================================================

export const getProfitabilitySegments = createServerFn({ method: 'GET' })
  .inputValidator(valueRangeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const startDate = getValueStartDate(data.range, new Date());
    const startDateString = startDate ? startDate.toISOString().split('T')[0] : null;

    const segments = await db.execute<{
      segment: string;
      customers: number;
      total_revenue: number;
      avg_order_value: number;
    }>(sql`
      WITH customer_orders AS (
        SELECT
          o.customer_id,
          COUNT(*) AS orders,
          COALESCE(SUM(o.total), 0) AS revenue,
          COALESCE(AVG(o.total), 0) AS avg_order_value
        FROM ${orders} o
        WHERE o.organization_id = ${ctx.organizationId}
          AND o.deleted_at IS NULL
          AND o.status NOT IN ('draft', 'cancelled')
          ${startDateString ? sql`AND o.order_date >= ${startDateString}` : sql``}
        GROUP BY o.customer_id
      )
      SELECT
        CASE
          WHEN revenue >= 100000 THEN 'High Margin'
          WHEN revenue >= 50000 THEN 'Mid Margin'
          ELSE 'Baseline'
        END AS segment,
        COUNT(*) AS customers,
        COALESCE(SUM(revenue), 0) AS total_revenue,
        COALESCE(AVG(avg_order_value), 0) AS avg_order_value
      FROM customer_orders
      GROUP BY 1
      ORDER BY total_revenue DESC
    `);

    const segmentRows = segments as unknown as {
      segment: string;
      customers: number;
      total_revenue: number;
      avg_order_value: number;
    }[];

    return {
      segments: segmentRows.map((row) => ({
        name: row.segment,
        customers: Number(row.customers ?? 0),
        revenue: Number(row.total_revenue ?? 0),
        avgOrderValue: Number(row.avg_order_value ?? 0),
      })),
    };
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStartDate(range: string, now: Date): Date | null {
  const d = new Date(now);
  switch (range) {
    case '7d':
      d.setDate(d.getDate() - 7);
      return d;
    case '30d':
      d.setDate(d.getDate() - 30);
      return d;
    case '90d':
      d.setDate(d.getDate() - 90);
      return d;
    case '365d':
      d.setFullYear(d.getFullYear() - 1);
      return d;
    default:
      return null;
  }
}

function getPreviousStartDate(range: string, currentStart: Date | null): Date | null {
  if (!currentStart) return null;
  const d = new Date(currentStart);
  switch (range) {
    case '7d':
      d.setDate(d.getDate() - 7);
      return d;
    case '30d':
      d.setDate(d.getDate() - 30);
      return d;
    case '90d':
      d.setDate(d.getDate() - 90);
      return d;
    case '365d':
      d.setFullYear(d.getFullYear() - 1);
      return d;
    default:
      return null;
  }
}

function getValueStartDate(range: string, now: Date): Date | null {
  const d = new Date(now);
  switch (range) {
    case '3m':
      d.setMonth(d.getMonth() - 3);
      return d;
    case '6m':
      d.setMonth(d.getMonth() - 6);
      return d;
    case '1y':
      d.setFullYear(d.getFullYear() - 1);
      return d;
    default:
      return null;
  }
}

function getIntervals(range: string): { truncate: string; format: string; startDate: Date } {
  const now = new Date();
  switch (range) {
    case '7d':
      return {
        truncate: 'day',
        format: 'Mon DD',
        startDate: new Date(now.setDate(now.getDate() - 7)),
      };
    case '30d':
      return {
        truncate: 'week',
        format: 'Mon DD',
        startDate: new Date(now.setDate(now.getDate() - 30)),
      };
    case '90d':
      return {
        truncate: 'month',
        format: 'Mon',
        startDate: new Date(now.setDate(now.getDate() - 90)),
      };
    case '365d':
      return {
        truncate: 'month',
        format: 'Mon YYYY',
        startDate: new Date(now.setFullYear(now.getFullYear() - 1)),
      };
    default:
      return {
        truncate: 'month',
        format: 'Mon YYYY',
        startDate: new Date(now.setFullYear(now.getFullYear() - 2)),
      };
  }
}

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-AU').format(n);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}
