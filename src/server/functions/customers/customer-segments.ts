/**
 * Customer Segments Server Functions
 *
 * Aggregate queries for segment management with statistics.
 * Extends basic customerTags with aggregated customer metrics.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { sql, eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { customerTags } from '@/../drizzle/schema';
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

    // Get all tags with aggregated customer stats
    const segments = await db.execute(sql`
      SELECT
        t.id,
        t.name,
        t.description,
        t.color,
        t.usage_count as customer_count,
        t.created_at,
        t.updated_at,
        COALESCE(stats.total_value, 0) as total_value,
        COALESCE(stats.avg_health_score, 0) as avg_health_score,
        COALESCE(stats.active_count, 0) as active_count
      FROM customer_tags t
      LEFT JOIN (
        SELECT
          ta.tag_id,
          SUM(COALESCE(c.lifetime_value, 0)) as total_value,
          AVG(COALESCE(c.health_score, 50)) as avg_health_score,
          COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_count
        FROM customer_tag_assignments ta
        JOIN customers c ON c.id = ta.customer_id
        WHERE c.organization_id = ${ctx.organizationId}
          AND c.deleted_at IS NULL
        GROUP BY ta.tag_id
      ) stats ON stats.tag_id = t.id
      WHERE t.organization_id = ${ctx.organizationId}
        ${!includeEmpty ? sql`AND t.usage_count > 0` : sql``}
      ORDER BY t.usage_count DESC, t.name ASC
    `);

    // Transform to typed response
    const segmentsWithStats: SegmentWithStats[] = ([...segments] as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      customerCount: Number(row.customer_count) || 0,
      totalValue: Number(row.total_value) || 0,
      avgHealthScore: Math.round(Number(row.avg_health_score) || 0),
      growth: 0, // Would require historical data to calculate
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: Number(row.active_count) > 0,
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

    // Get customers in this segment
    const customersInSegment = await db.execute(sql`
      SELECT
        c.id,
        c.name,
        c.customer_code,
        c.status,
        COALESCE(c.lifetime_value, 0) as lifetime_value,
        COALESCE(c.health_score, 50) as health_score
      FROM customers c
      JOIN customer_tag_assignments ta ON ta.customer_id = c.id
      WHERE ta.tag_id = ${segmentId}
        AND c.organization_id = ${ctx.organizationId}
        AND c.deleted_at IS NULL
      ORDER BY c.lifetime_value DESC
    `);

    const customersData = [...customersInSegment] as any[];

    // Calculate health distribution
    const healthBuckets = { excellent: 0, good: 0, fair: 0, poor: 0 };
    const statusCounts: Record<string, number> = {};

    for (const c of customersData) {
      const score = c.health_score;
      if (score >= 80) healthBuckets.excellent++;
      else if (score >= 60) healthBuckets.good++;
      else if (score >= 40) healthBuckets.fair++;
      else healthBuckets.poor++;

      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    }

    const total = customersData.length || 1;

    const healthDistribution = [
      {
        level: 'Excellent',
        count: healthBuckets.excellent,
        percentage: Math.round((healthBuckets.excellent / total) * 100),
        color: 'bg-green-500',
      },
      {
        level: 'Good',
        count: healthBuckets.good,
        percentage: Math.round((healthBuckets.good / total) * 100),
        color: 'bg-blue-500',
      },
      {
        level: 'Fair',
        count: healthBuckets.fair,
        percentage: Math.round((healthBuckets.fair / total) * 100),
        color: 'bg-yellow-500',
      },
      {
        level: 'Poor',
        count: healthBuckets.poor,
        percentage: Math.round((healthBuckets.poor / total) * 100),
        color: 'bg-red-500',
      },
    ];

    const customersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 100),
    }));

    // Top 10 customers by LTV
    const topCustomers = customersData.slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      customerCode: c.customer_code,
      lifetimeValue: Number(c.lifetime_value),
      healthScore: c.health_score,
    }));

    // Build segment stats
    const totalValue = customersData.reduce((sum, c) => sum + Number(c.lifetime_value), 0);
    const avgHealth =
      customersData.reduce((sum, c) => sum + Number(c.health_score), 0) / (total || 1);

    const segmentWithStats: SegmentWithStats = {
      id: segment.id,
      name: segment.name,
      description: segment.description,
      color: segment.color,
      customerCount: customersData.length,
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
