/**
 * Dashboard Targets Server Functions
 *
 * Server functions for KPI targets CRUD operations.
 * Uses Drizzle ORM with Zod validation.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/dashboard/targets.ts for validation schemas
 * @see drizzle/schema/dashboard/targets.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, ilike, desc, asc, gte, lte, sql, count, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { targets } from 'drizzle/schema/dashboard';
import { orders, customers, opportunities } from 'drizzle/schema';
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
} from '@/lib/schemas/dashboard/targets';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate actual value for a given metric type and date range.
 */
async function calculateMetricValue(
  metric: TargetMetric,
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  switch (metric) {
    case 'revenue': {
      const [result] = await db
        .select({ total: sql<number>`COALESCE(SUM(${orders.total}), 0)` })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, organizationId),
            gte(orders.orderDate, startDate),
            lte(orders.orderDate, endDate)
          )
        );
      return Number(result?.total ?? 0);
    }

    case 'orders_count': {
      const [result] = await db
        .select({ count: count() })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, organizationId),
            gte(orders.orderDate, startDate),
            lte(orders.orderDate, endDate)
          )
        );
      return Number(result?.count ?? 0);
    }

    case 'customer_count': {
      const [result] = await db
        .select({ count: count() })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, organizationId),
            sql`${customers.deletedAt} IS NULL`,
            gte(customers.createdAt, new Date(startDate)),
            lte(customers.createdAt, new Date(endDate))
          )
        );
      return Number(result?.count ?? 0);
    }

    case 'pipeline_value': {
      const [result] = await db
        .select({ total: sql<number>`COALESCE(SUM(${opportunities.value}), 0)` })
        .from(opportunities)
        .where(
          and(
            eq(opportunities.organizationId, organizationId),
            sql`${opportunities.stage} NOT IN ('won', 'lost')`,
            gte(opportunities.createdAt, new Date(startDate)),
            lte(opportunities.createdAt, new Date(endDate))
          )
        );
      return Number(result?.total ?? 0);
    }

    case 'average_order_value': {
      const [result] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
          count: count(),
        })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, organizationId),
            gte(orders.orderDate, startDate),
            lte(orders.orderDate, endDate)
          )
        );
      const total = Number(result?.total ?? 0);
      const orderCount = Number(result?.count ?? 0);
      return orderCount > 0 ? total / orderCount : 0;
    }

    // Placeholder for metrics that require additional schema/tables
    case 'kwh_deployed':
    case 'quote_win_rate':
    case 'active_installations':
    case 'warranty_claims':
    default:
      // Return 0 for metrics that don't have backing data yet
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
      conditions.push(ilike(targets.name, `%${search}%`));
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
      throw new Error('Target not found');
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
      throw new Error('Target not found');
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
      throw new Error('Target not found');
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

    // Get active targets
    const activeTargets = await db
      .select()
      .from(targets)
      .where(and(...conditions));

    // Calculate progress for each target
    const progressItems: TargetProgress[] = await Promise.all(
      activeTargets.map(async (target) => {
        const targetValue = Number(target.targetValue);
        // Drizzle date columns return strings
        const startDate = target.startDate;

        // Calculate actual metric value for the target period
        const currentValue = await calculateMetricValue(
          target.metric as TargetMetric,
          ctx.organizationId,
          startDate,
          today // Use today as end date since target is still active
        );

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
