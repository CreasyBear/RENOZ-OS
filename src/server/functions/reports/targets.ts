/**
 * Reports Targets Server Functions
 *
 * Server functions for KPI targets CRUD operations.
 * Uses Drizzle ORM with Zod validation.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/reports/targets.ts for validation schemas
 * @see drizzle/schema/reports/targets.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, ilike, desc, asc, gte, lte, sql, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { targets } from 'drizzle/schema/reports';
import {
  createTargetSchema,
  updateTargetSchema,
  listTargetsSchema,
  getTargetSchema,
  deleteTargetSchema,
  getTargetProgressSchema,
  bulkCreateTargetsSchema,
  bulkUpdateTargetsSchema,
  bulkDeleteTargetsSchema,
  type TargetProgress,
  type TargetProgressResponse,
  type TargetMetric,
} from '@/lib/schemas/reports/targets';
import { NotFoundError } from '@/lib/server/errors';
import { calculateMetric } from '@/server/functions/metrics/aggregator';
import { type MetricId } from '@/lib/metrics/registry';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate actual value for a given metric type and date range.
 * Uses centralized metric aggregator for consistent calculations.
 */
async function calculateMetricValue(
  metric: TargetMetric,
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  // Use centralized aggregator - consistent with all other reports
  try {
    const result = await calculateMetric({
      organizationId,
      metricId: metric as MetricId,
      dateFrom: startDate,
      dateTo: endDate,
    });
    return result.value;
  } catch {
    // Return 0 for metrics that don't have backing data yet (legacy support)
    return 0;
  }
}

/**
 * Determine target status based on percentage and days remaining.
 */
function determineTargetStatus(
  percentage: number,
  daysRemaining: number,
  totalDays: number
): 'on_track' | 'behind' | 'ahead' | 'completed' {
  if (percentage >= 100) {
    return 'completed';
  }

  // Calculate expected progress based on time elapsed
  const daysElapsed = totalDays - daysRemaining;
  const expectedPercentage = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

  // Give some buffer (within 10% of expected is on_track)
  if (percentage >= expectedPercentage - 10) {
    return percentage > expectedPercentage + 10 ? 'ahead' : 'on_track';
  }

  return 'behind';
}

// ============================================================================
// TARGETS CRUD
// ============================================================================

/**
 * List targets with filtering and pagination.
 */
export const listTargets = createServerFn({ method: 'GET' })
  .inputValidator(listTargetsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });

    const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc', search, metric, period, startDate, endDate } = data;

    // Build where conditions
    const conditions = [eq(targets.organizationId, ctx.organizationId)];

    if (search) {
      conditions.push(ilike(targets.name, containsPattern(search)));
    }
    if (metric) {
      conditions.push(eq(targets.metric, metric));
    }
    if (period) {
      conditions.push(eq(targets.period, period));
    }
    if (startDate) {
      conditions.push(gte(targets.startDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(targets.endDate, endDate));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(targets)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results
    const orderColumn = sortBy === 'name' ? targets.name : targets.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const items = await db
      .select()
      .from(targets)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Get a single target by ID.
 */
export const getTarget = createServerFn({ method: 'GET' })
  .inputValidator(getTargetSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });

    const [target] = await db
      .select()
      .from(targets)
      .where(
        and(
          eq(targets.id, data.id),
          eq(targets.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!target) {
      throw new NotFoundError('Target not found', 'target');
    }

    return target;
  });

/**
 * Create a new target.
 */
export const createTarget = createServerFn({ method: 'POST' })
  .inputValidator(createTargetSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.manageTargets });

    const [target] = await db
      .insert(targets)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        metric: data.metric,
        period: data.period,
        startDate: data.startDate,
        endDate: data.endDate,
        targetValue: data.targetValue,
        description: data.description,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return target;
  });

/**
 * Update an existing target.
 */
export const updateTarget = createServerFn({ method: 'POST' })
  .inputValidator(updateTargetSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.manageTargets });

    const { id, ...updates } = data;

    const [target] = await db
      .update(targets)
      .set({
        ...updates,
        targetValue: updates.targetValue,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(targets.id, id),
          eq(targets.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!target) {
      throw new NotFoundError('Target not found', 'target');
    }

    return target;
  });

/**
 * Delete a target (hard delete since no soft delete column).
 */
export const deleteTarget = createServerFn({ method: 'POST' })
  .inputValidator(deleteTargetSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.manageTargets });

    const [target] = await db
      .delete(targets)
      .where(
        and(
          eq(targets.id, data.id),
          eq(targets.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!target) {
      throw new NotFoundError('Target not found', 'target');
    }

    return { success: true };
  });

// ============================================================================
// TARGET PROGRESS
// ============================================================================

/**
 * Get progress toward targets with real metric calculations.
 */
export const getTargetProgress = createServerFn({ method: 'GET' })
  .inputValidator(getTargetProgressSchema)
  .handler(async ({ data }): Promise<TargetProgressResponse> => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.read });

    const today = new Date().toISOString().split('T')[0];

    // Build conditions for active targets
    const conditions = [
      eq(targets.organizationId, ctx.organizationId),
      lte(targets.startDate, today),
      gte(targets.endDate, today),
    ];

    // Apply optional filters from input
    if (data.metric) {
      conditions.push(eq(targets.metric, data.metric));
    }
    if (data.period) {
      conditions.push(eq(targets.period, data.period));
    }

    // Get active targets (limit to reasonable number for dashboard)
    const activeTargets = await db
      .select()
      .from(targets)
      .where(and(...conditions))
      .limit(100); // Reasonable limit for dashboard display

    // Calculate progress for each target in parallel
    // Each target may have different metrics/date ranges, so we can't batch the queries
    // but Promise.all ensures they run concurrently for better performance
    const progressItems: TargetProgress[] = await Promise.all(
      activeTargets.map(async (target) => {
        const targetValue = Number(target.targetValue);
        // Drizzle date columns return strings
        const startDate = target.startDate;

        // Calculate actual metric value for the target period
        // Errors are handled in calculateMetricValue wrapper
        let currentValue = 0;
        try {
          currentValue = await calculateMetricValue(
            target.metric as TargetMetric,
            ctx.organizationId,
            startDate,
            today // Use today as end date since target is still active
          );
        } catch (error) {
          // Log error but don't fail entire request - show 0 progress for failed metric
          console.error(`Failed to calculate progress for target ${target.id} (${target.metric}):`, error);
          currentValue = 0;
        }

        const percentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

        const endDateObj = new Date(target.endDate);
        const startDateObj = new Date(target.startDate);
        const todayDate = new Date();

        const daysRemaining = Math.max(
          0,
          Math.ceil((endDateObj.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        const totalDays = Math.ceil(
          (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );

        const status = determineTargetStatus(percentage, daysRemaining, totalDays);

        return {
          targetId: target.id,
          targetName: target.name,
          metric: target.metric as TargetMetric,
          period: target.period,
          targetValue,
          currentValue,
          percentage: Math.round(percentage * 100) / 100,
          status,
          daysRemaining,
          startDate: startDateObj,
          endDate: endDateObj,
        };
      })
    );

    const achieved = progressItems.filter((p) => p.status === 'completed').length;

    return {
      targets: progressItems,
      overall: {
        achieved,
        total: progressItems.length,
        percentage:
          progressItems.length > 0 ? Math.round((achieved / progressItems.length) * 100) : 0,
      },
    };
  });

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk create multiple targets.
 */
export const bulkCreateTargets = createServerFn({ method: 'POST' })
  .inputValidator(bulkCreateTargetsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.manageTargets });

    const newTargets = await db.transaction(async (tx) => {
      const created = await tx
        .insert(targets)
        .values(
          data.targets.map((t) => ({
            organizationId: ctx.organizationId,
            name: t.name,
            metric: t.metric,
            period: t.period,
            startDate: t.startDate,
            endDate: t.endDate,
            targetValue: t.targetValue,
            description: t.description,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          }))
        )
        .returning();

      return created;
    });

    return {
      targets: newTargets,
      count: newTargets.length,
    };
  });

/**
 * Bulk update multiple targets.
 */
export const bulkUpdateTargets = createServerFn({ method: 'POST' })
  .inputValidator(bulkUpdateTargetsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.manageTargets });

    const updated = await db.transaction(async (tx) => {
      const results = [];

      for (const update of data.updates) {
        const { id, ...updates } = update;

        const [target] = await tx
          .update(targets)
          .set({
            ...updates,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(targets.id, id),
              eq(targets.organizationId, ctx.organizationId)
            )
          )
          .returning();

        if (target) {
          results.push(target);
        }
      }

      return results;
    });

    return {
      targets: updated,
      count: updated.length,
    };
  });

/**
 * Bulk delete multiple targets.
 */
export const bulkDeleteTargets = createServerFn({ method: 'POST' })
  .inputValidator(bulkDeleteTargetsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.manageTargets });

    const deleted = await db
      .delete(targets)
      .where(
        and(
          inArray(targets.id, data.ids),
          eq(targets.organizationId, ctx.organizationId)
        )
      )
      .returning();

    return {
      deleted: deleted.map((t) => t.id),
      count: deleted.length,
    };
  });
