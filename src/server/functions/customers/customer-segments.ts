/**
 * Customer Segments Server Functions
 *
 * Aggregate queries for segment management with statistics.
 * Extends basic customerTags with aggregated customer metrics.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { sql, eq, and, desc, asc, isNull, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { customerTags, customerTagAssignments, customers } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';

// ============================================================================
// TYPES
// ============================================================================

export interface SegmentWithStats {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  customerCount: number;
  totalValue: number;
  avgHealthScore: number;
  growth: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  criteriaCount: number;
}

// ============================================================================
// GET SEGMENTS WITH STATS
// ============================================================================

/**
 * Get all segments (tags) with aggregated customer statistics.
 * Returns customer count, total LTV, average health score for each segment.
 */
export const getSegmentsWithStats = createServerFn({ method: 'GET' })
  .inputValidator(
    z
      .object({
        includeEmpty: z.boolean().default(false),
      })
      .optional()
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const includeEmpty = data?.includeEmpty ?? false;

    // Get all tags with aggregated customer stats using Drizzle query builder
    // Use LEFT JOINs with aggregations (pattern matches customer-analytics.ts getSegmentPerformance)
    const segments = await db
      .select({
        id: customerTags.id,
        name: customerTags.name,
        description: customerTags.description,
        color: customerTags.color,
        customerCount: customerTags.usageCount,
        createdAt: customerTags.createdAt,
        updatedAt: customerTags.updatedAt,
        totalValue: sql<number>`COALESCE(SUM(${customers.lifetimeValue}), 0)::numeric`,
        avgHealthScore: sql<number>`COALESCE(AVG(${customers.healthScore}), 0)::numeric`,
        activeCount: sql<number>`COUNT(CASE WHEN ${customers.status} = 'active' THEN 1 END)::int`,
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
      .where(
        and(
          eq(customerTags.organizationId, ctx.organizationId),
          includeEmpty ? sql`1=1` : gt(customerTags.usageCount, 0)
        )
      )
      .groupBy(
        customerTags.id,
        customerTags.name,
        customerTags.description,
        customerTags.color,
        customerTags.usageCount,
        customerTags.createdAt,
        customerTags.updatedAt
      )
      .orderBy(desc(customerTags.usageCount), asc(customerTags.name));

    // Transform to typed response
    const segmentsWithStats: SegmentWithStats[] = segments.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      customerCount: Number(row.customerCount ?? 0),
      totalValue: Number(row.totalValue ?? 0),
      avgHealthScore: Math.round(Number(row.avgHealthScore ?? 0)),
      growth: 0, // Would require historical data to calculate
      createdAt: row.createdAt?.toISOString() ?? '',
      updatedAt: row.updatedAt?.toISOString() ?? '',
      isActive: Number(row.activeCount ?? 0) > 0,
      criteriaCount: 1, // Tags are single-criteria segments
    }));

    return { segments: segmentsWithStats };
  });

// ============================================================================
// GET SEGMENT ANALYTICS
// ============================================================================

export interface SegmentAnalyticsData {
  segment: SegmentWithStats | null;
  healthDistribution: Array<{
    level: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  customersByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    customerCode: string;
    lifetimeValue: number;
    healthScore: number | null;
  }>;
}

/**
 * Get detailed analytics for a specific segment.
 */
export const getSegmentAnalytics = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      segmentId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const { segmentId } = data;

    // Get segment info
    const [segment] = await db
      .select()
      .from(customerTags)
      .where(
        and(eq(customerTags.id, segmentId), eq(customerTags.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!segment) {
      return {
        segment: null,
        healthDistribution: [],
        customersByStatus: [],
        topCustomers: [],
      };
    }

    // Segment base conditions for reuse
    const segmentConditions = and(
      eq(customerTagAssignments.tagId, segmentId),
      eq(customers.organizationId, ctx.organizationId),
      isNull(customers.deletedAt)
    );

    // Run aggregation in SQL instead of fetching all rows and bucketing in JS
    const [aggregationResult, statusResult] = await Promise.all([
      // Aggregate health buckets, total value, avg health, and count in SQL
      db
        .select({
          total: sql<number>`COUNT(*)::int`.as('total'),
          excellent: sql<number>`SUM(CASE WHEN COALESCE(${customers.healthScore}, 50) >= 80 THEN 1 ELSE 0 END)::int`.as('excellent'),
          good: sql<number>`SUM(CASE WHEN COALESCE(${customers.healthScore}, 50) >= 60 AND COALESCE(${customers.healthScore}, 50) < 80 THEN 1 ELSE 0 END)::int`.as('good'),
          fair: sql<number>`SUM(CASE WHEN COALESCE(${customers.healthScore}, 50) >= 40 AND COALESCE(${customers.healthScore}, 50) < 60 THEN 1 ELSE 0 END)::int`.as('fair'),
          poor: sql<number>`SUM(CASE WHEN COALESCE(${customers.healthScore}, 50) < 40 THEN 1 ELSE 0 END)::int`.as('poor'),
          totalValue: sql<number>`COALESCE(SUM(COALESCE(${customers.lifetimeValue}, 0)), 0)::numeric`.as('total_value'),
          avgHealth: sql<number>`COALESCE(AVG(COALESCE(${customers.healthScore}, 50)), 0)::numeric`.as('avg_health'),
        })
        .from(customers)
        .innerJoin(customerTagAssignments, eq(customerTagAssignments.customerId, customers.id))
        .where(segmentConditions),

      // Aggregate status counts in SQL
      db
        .select({
          status: customers.status,
          count: sql<number>`COUNT(*)::int`.as('count'),
        })
        .from(customers)
        .innerJoin(customerTagAssignments, eq(customerTagAssignments.customerId, customers.id))
        .where(segmentConditions)
        .groupBy(customers.status),
    ]);

    const agg = aggregationResult[0] ?? { total: 0, excellent: 0, good: 0, fair: 0, poor: 0, totalValue: 0, avgHealth: 0 };
    const total = agg.total || 1;

    const healthDistribution = [
      {
        level: 'Excellent',
        count: agg.excellent,
        percentage: Math.round((agg.excellent / total) * 100),
        color: 'bg-green-500',
      },
      {
        level: 'Good',
        count: agg.good,
        percentage: Math.round((agg.good / total) * 100),
        color: 'bg-blue-500',
      },
      {
        level: 'Fair',
        count: agg.fair,
        percentage: Math.round((agg.fair / total) * 100),
        color: 'bg-yellow-500',
      },
      {
        level: 'Poor',
        count: agg.poor,
        percentage: Math.round((agg.poor / total) * 100),
        color: 'bg-red-500',
      },
    ];

    const customersByStatus = statusResult.map((row) => ({
      status: row.status,
      count: row.count,
      percentage: Math.round((row.count / total) * 100),
    }));

    // Top 10 customers by LTV — fetched via SQL with LIMIT
    const topCustomersResult = await db
      .select({
        id: customers.id,
        name: customers.name,
        customerCode: customers.customerCode,
        lifetimeValue: sql<number>`COALESCE(${customers.lifetimeValue}, 0)::numeric`,
        healthScore: sql<number>`COALESCE(${customers.healthScore}, 50)::numeric`,
      })
      .from(customers)
      .innerJoin(customerTagAssignments, eq(customerTagAssignments.customerId, customers.id))
      .where(segmentConditions)
      .orderBy(desc(customers.lifetimeValue))
      .limit(10);

    const topCustomers = topCustomersResult.map((c) => ({
      id: c.id,
      name: c.name,
      customerCode: c.customerCode,
      lifetimeValue: Number(c.lifetimeValue ?? 0),
      healthScore: Number(c.healthScore ?? 0),
    }));

    // Build segment stats from SQL aggregation
    const totalValue = Number(agg.totalValue);
    const avgHealth = Number(agg.avgHealth);

    const segmentWithStats: SegmentWithStats = {
      id: segment.id,
      name: segment.name,
      description: segment.description,
      color: segment.color,
      customerCount: agg.total,
      totalValue,
      avgHealthScore: Math.round(avgHealth),
      growth: 0,
      createdAt: segment.createdAt?.toISOString() ?? '',
      updatedAt: segment.updatedAt?.toISOString() ?? '',
      isActive: true,
      criteriaCount: 1,
    };

    return {
      segment: segmentWithStats,
      healthDistribution,
      customersByStatus,
      topCustomers,
    };
  });
