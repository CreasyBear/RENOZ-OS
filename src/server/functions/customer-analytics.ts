/**
 * Customer Analytics Server Functions
 *
 * Aggregate queries for customer analytics, reporting, and dashboards.
 * These functions compute KPIs, trends, and distributions from customer data.
 *
 * ARCHITECTURE: Routes fetch this data and pass to presentational components.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { sql, eq, and, gte, lte, count, sum, avg } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customers, customerTags, customerTagAssignments } from 'drizzle/schema'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'

// ============================================================================
// SCHEMAS
// ============================================================================

export const dateRangeSchema = z.object({
  range: z.enum(['7d', '30d', '90d', '365d', 'all']).default('30d'),
})

export const segmentAnalyticsSchema = z.object({
  segmentId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
})

// ============================================================================
// DASHBOARD KPIs
// ============================================================================

/**
 * Get key performance indicators for customer dashboard
 */
export const getCustomerKpis = createServerFn({ method: 'GET' })
  .inputValidator(dateRangeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const { range } = data
    const now = new Date()
    const startDate = getStartDate(range, now)
    const previousStartDate = getPreviousStartDate(range, startDate)

    // Current period metrics
    const currentMetrics = await db
      .select({
        totalCustomers: count(),
        totalRevenue: sum(customers.lifetimeValue),
        avgLifetimeValue: avg(customers.lifetimeValue),
        activeCustomers: count(sql`CASE WHEN ${customers.status} = 'active' THEN 1 END`),
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          sql`${customers.deletedAt} IS NULL`,
          startDate ? gte(customers.createdAt, startDate) : sql`1=1`
        )
      )

    // Previous period for comparison
    const previousMetrics = await db
      .select({
        totalCustomers: count(),
        totalRevenue: sum(customers.lifetimeValue),
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          sql`${customers.deletedAt} IS NULL`,
          previousStartDate ? gte(customers.createdAt, previousStartDate) : sql`1=1`,
          startDate ? lte(customers.createdAt, startDate) : sql`1=1`
        )
      )

    const current = currentMetrics[0]
    const previous = previousMetrics[0]

    // Calculate changes
    const customerChange = calculatePercentChange(
      Number(current?.totalCustomers ?? 0),
      Number(previous?.totalCustomers ?? 0)
    )
    const revenueChange = calculatePercentChange(
      Number(current?.totalRevenue ?? 0),
      Number(previous?.totalRevenue ?? 0)
    )

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
          value: formatCurrency(Number(current?.totalRevenue ?? 0)),
          change: revenueChange,
          changeLabel: `vs previous ${range}`,
          icon: 'dollar',
        },
        {
          label: 'Average LTV',
          value: formatCurrency(Number(current?.avgLifetimeValue ?? 0)),
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
    }
  })

// ============================================================================
// HEALTH DISTRIBUTION
// ============================================================================

/**
 * Get customer health score distribution
 */
export const getHealthDistribution = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const distribution = await db
      .select({
        excellent: count(sql`CASE WHEN ${customers.healthScore} >= 80 THEN 1 END`),
        good: count(sql`CASE WHEN ${customers.healthScore} >= 60 AND ${customers.healthScore} < 80 THEN 1 END`),
        fair: count(sql`CASE WHEN ${customers.healthScore} >= 40 AND ${customers.healthScore} < 60 THEN 1 END`),
        atRisk: count(sql`CASE WHEN ${customers.healthScore} < 40 THEN 1 END`),
        total: count(),
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          sql`${customers.deletedAt} IS NULL`,
          sql`${customers.healthScore} IS NOT NULL`
        )
      )

    const d = distribution[0]
    const total = Number(d?.total ?? 1)

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
    }
  })

// ============================================================================
// CUSTOMER TRENDS
// ============================================================================

/**
 * Get customer count trends over time
 */
export const getCustomerTrends = createServerFn({ method: 'GET' })
  .inputValidator(dateRangeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const { range } = data
    const intervals = getIntervals(range)

    // Get customer counts by period
    const trends = await db.execute<{ period: string; customer_count: number; revenue: number }>(sql`
      SELECT
        TO_CHAR(DATE_TRUNC(${intervals.truncate}, ${customers.createdAt}::timestamp), ${intervals.format}) as period,
        COUNT(*) as customer_count,
        COALESCE(SUM(${customers.lifetimeValue}), 0) as revenue
      FROM ${customers}
      WHERE ${customers.organizationId} = ${ctx.organizationId}
        AND ${customers.deletedAt} IS NULL
        AND ${customers.createdAt} >= ${intervals.startDate.toISOString()}
      GROUP BY DATE_TRUNC(${intervals.truncate}, ${customers.createdAt}::timestamp)
      ORDER BY DATE_TRUNC(${intervals.truncate}, ${customers.createdAt}::timestamp) ASC
    `)

    const trendsData = trends as unknown as { period: string; customer_count: number; revenue: number }[]

    return {
      customerTrend: trendsData.map((row) => ({
        period: row.period,
        value: Number(row.customer_count),
      })),
      revenueTrend: trendsData.map((row) => ({
        period: row.period,
        value: Number(row.revenue),
      })),
    }
  })

// ============================================================================
// SEGMENT/TAG ANALYTICS
// ============================================================================

/**
 * Get segment (tag) performance metrics
 */
export const getSegmentPerformance = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    // Get metrics per tag (segment)
    const segments = await db.execute<{
      id: string
      name: string
      customer_count: number
      total_revenue: number
      avg_health_score: number
    }>(sql`
      SELECT
        ct.id,
        ct.name,
        COUNT(DISTINCT cta.customer_id) as customer_count,
        COALESCE(SUM(c.lifetime_value), 0) as total_revenue,
        COALESCE(AVG(c.health_score), 0) as avg_health_score
      FROM ${customerTags} ct
      LEFT JOIN ${customerTagAssignments} cta ON cta.tag_id = ct.id
      LEFT JOIN ${customers} c ON c.id = cta.customer_id AND c.deleted_at IS NULL
      WHERE ct.organization_id = ${ctx.organizationId}
      GROUP BY ct.id, ct.name
      ORDER BY total_revenue DESC
      LIMIT 10
    `)

    const segmentsData = segments as unknown as {
      id: string
      name: string
      customer_count: number
      total_revenue: number
      avg_health_score: number
    }[]

    return {
      segments: segmentsData.map((row) => ({
        id: row.id,
        name: row.name,
        customers: Number(row.customer_count),
        revenue: Number(row.total_revenue),
        healthScore: Math.round(Number(row.avg_health_score)),
        growth: 0, // Would need historical comparison
      })),
    }
  })

/**
 * Get analytics for a specific segment/tag
 */
export const getSegmentAnalytics = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tagId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const { tagId } = data

    // Get tag info and metrics
    const tagResult = await db
      .select({
        id: customerTags.id,
        name: customerTags.name,
        description: customerTags.description,
      })
      .from(customerTags)
      .where(
        and(
          eq(customerTags.id, tagId),
          eq(customerTags.organizationId, ctx.organizationId)
        )
      )
      .limit(1)

    if (!tagResult[0]) {
      throw new Error('Segment not found')
    }

    // Get customer metrics for this segment
    const metrics = await db.execute<{
      customer_count: number
      total_value: number
      avg_value: number
      avg_health: number
      excellent_count: number
      good_count: number
      fair_count: number
      at_risk_count: number
    }>(sql`
      SELECT
        COUNT(DISTINCT c.id) as customer_count,
        COALESCE(SUM(c.lifetime_value), 0) as total_value,
        COALESCE(AVG(c.lifetime_value), 0) as avg_value,
        COALESCE(AVG(c.health_score), 0) as avg_health,
        COUNT(CASE WHEN c.health_score >= 80 THEN 1 END) as excellent_count,
        COUNT(CASE WHEN c.health_score >= 60 AND c.health_score < 80 THEN 1 END) as good_count,
        COUNT(CASE WHEN c.health_score >= 40 AND c.health_score < 60 THEN 1 END) as fair_count,
        COUNT(CASE WHEN c.health_score < 40 THEN 1 END) as at_risk_count
      FROM ${customers} c
      INNER JOIN ${customerTagAssignments} cta ON cta.customer_id = c.id
      WHERE cta.tag_id = ${tagId}
        AND c.organization_id = ${ctx.organizationId}
        AND c.deleted_at IS NULL
    `)

    const metricsData = metrics as unknown as {
      customer_count: number
      total_value: number
      avg_value: number
      avg_health: number
      excellent_count: number
      good_count: number
      fair_count: number
      at_risk_count: number
    }[]
    const m = metricsData[0]
    const total = Number(m?.customer_count ?? 1)

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
    }
  })

// ============================================================================
// LIFECYCLE ANALYTICS
// ============================================================================

/**
 * Get customer lifecycle stage distribution
 */
export const getLifecycleStages = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    // Map status to lifecycle stages
    const stages = await db
      .select({
        status: customers.status,
        count: count(),
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          sql`${customers.deletedAt} IS NULL`
        )
      )
      .groupBy(customers.status)

    const total = stages.reduce((sum, s) => sum + Number(s.count), 0) || 1

    // Map to UI-friendly format
    const stageMapping: Record<string, { name: string; color: string }> = {
      prospect: { name: 'Prospect', color: 'bg-blue-500' },
      active: { name: 'Active', color: 'bg-green-500' },
      inactive: { name: 'Inactive', color: 'bg-gray-500' },
      suspended: { name: 'Suspended', color: 'bg-red-500' },
    }

    return {
      stages: stages.map((s) => ({
        name: stageMapping[s.status]?.name ?? s.status,
        count: Number(s.count),
        percentage: Math.round((Number(s.count) / total) * 100 * 10) / 10,
        color: stageMapping[s.status]?.color ?? 'bg-gray-500',
      })),
    }
  })

/**
 * Get value tier distribution (Platinum, Gold, Silver, Bronze)
 */
export const getValueTiers = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    // Define tier thresholds (configurable in future)
    const tiers = await db.execute<{
      tier: string
      customer_count: number
      total_revenue: number
      avg_value: number
    }>(sql`
      SELECT
        CASE
          WHEN ${customers.lifetimeValue} >= 100000 THEN 'Platinum'
          WHEN ${customers.lifetimeValue} >= 50000 THEN 'Gold'
          WHEN ${customers.lifetimeValue} >= 10000 THEN 'Silver'
          ELSE 'Bronze'
        END as tier,
        COUNT(*) as customer_count,
        COALESCE(SUM(${customers.lifetimeValue}), 0) as total_revenue,
        COALESCE(AVG(${customers.lifetimeValue}), 0) as avg_value
      FROM ${customers}
      WHERE ${customers.organizationId} = ${ctx.organizationId}
        AND ${customers.deletedAt} IS NULL
      GROUP BY 1
      ORDER BY avg_value DESC
    `)

    const tiersData = tiers as unknown as {
      tier: string
      customer_count: number
      total_revenue: number
      avg_value: number
    }[]

    const total = tiersData.reduce((sum, t) => sum + Number(t.customer_count), 0) || 1

    const tierColors: Record<string, string> = {
      Platinum: 'bg-purple-500',
      Gold: 'bg-yellow-500',
      Silver: 'bg-gray-400',
      Bronze: 'bg-orange-700',
    }

    return {
      tiers: tiersData.map((t) => ({
        name: t.tier,
        customers: Number(t.customer_count),
        percentage: Math.round((Number(t.customer_count) / total) * 100 * 10) / 10,
        revenue: Number(t.total_revenue),
        avgValue: Math.round(Number(t.avg_value)),
        color: tierColors[t.tier] ?? 'bg-gray-500',
      })),
    }
  })

/**
 * Get top customers by lifetime value
 */
export const getTopCustomers = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ limit: z.number().min(1).max(50).default(10) }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const topCustomers = await db
      .select({
        id: customers.id,
        name: customers.name,
        customerCode: customers.customerCode,
        lifetimeValue: customers.lifetimeValue,
        totalOrders: customers.totalOrders,
        healthScore: customers.healthScore,
        status: customers.status,
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, ctx.organizationId),
          sql`${customers.deletedAt} IS NULL`
        )
      )
      .orderBy(sql`${customers.lifetimeValue} DESC NULLS LAST`)
      .limit(data.limit)

    return {
      customers: topCustomers.map((c, idx) => ({
        rank: idx + 1,
        id: c.id,
        name: c.name,
        code: c.customerCode,
        ltv: Number(c.lifetimeValue ?? 0),
        orders: Number(c.totalOrders ?? 0),
        avgOrder: Number(c.totalOrders ?? 0) > 0
          ? Math.round(Number(c.lifetimeValue ?? 0) / Number(c.totalOrders))
          : 0,
        healthScore: c.healthScore,
        status: c.status,
      })),
    }
  })

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStartDate(range: string, now: Date): Date | null {
  const d = new Date(now)
  switch (range) {
    case '7d':
      d.setDate(d.getDate() - 7)
      return d
    case '30d':
      d.setDate(d.getDate() - 30)
      return d
    case '90d':
      d.setDate(d.getDate() - 90)
      return d
    case '365d':
      d.setFullYear(d.getFullYear() - 1)
      return d
    default:
      return null
  }
}

function getPreviousStartDate(range: string, currentStart: Date | null): Date | null {
  if (!currentStart) return null
  const d = new Date(currentStart)
  switch (range) {
    case '7d':
      d.setDate(d.getDate() - 7)
      return d
    case '30d':
      d.setDate(d.getDate() - 30)
      return d
    case '90d':
      d.setDate(d.getDate() - 90)
      return d
    case '365d':
      d.setFullYear(d.getFullYear() - 1)
      return d
    default:
      return null
  }
}

function getIntervals(range: string): { truncate: string; format: string; startDate: Date } {
  const now = new Date()
  switch (range) {
    case '7d':
      return {
        truncate: 'day',
        format: 'Mon DD',
        startDate: new Date(now.setDate(now.getDate() - 7)),
      }
    case '30d':
      return {
        truncate: 'week',
        format: 'Mon DD',
        startDate: new Date(now.setDate(now.getDate() - 30)),
      }
    case '90d':
      return {
        truncate: 'month',
        format: 'Mon',
        startDate: new Date(now.setDate(now.getDate() - 90)),
      }
    case '365d':
      return {
        truncate: 'month',
        format: 'Mon YYYY',
        startDate: new Date(now.setFullYear(now.getFullYear() - 1)),
      }
    default:
      return {
        truncate: 'month',
        format: 'Mon YYYY',
        startDate: new Date(now.setFullYear(now.getFullYear() - 2)),
      }
  }
}

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-AU').format(n)
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}
