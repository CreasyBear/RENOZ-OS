/**
 * Inventory Alerts Server Functions
 *
 * Alert configuration, triggering, and management for inventory monitoring.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { inventoryAlerts, products, warehouseLocations } from 'drizzle/schema';
import type { AlertThreshold } from '@/lib/schemas/inventory';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError } from '@/lib/server/errors';
import {
  createAlertSchema,
  updateAlertSchema,
  alertListQuerySchema,
  type AlertWithDetails,
  type TriggeredAlert,
  type ListAlertsResult,
} from '@/lib/schemas/inventory';
import {
  alertLocationWhereCondition,
  alertProductWhereCondition,
} from './alert-query-conditions';
import {
  checkInventoryAlertTriggered,
  getTriggeredInventoryAlerts,
} from './triggered-alerts-read';

// ============================================================================
// ALERT CRUD
// ============================================================================

/**
 * List alerts with filtering.
 */
export const listAlerts = createServerFn({ method: 'GET' })
  .inputValidator(alertListQuerySchema)
  .handler(async ({ data }): Promise<ListAlertsResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    const { page = 1, pageSize = 20, ...filters } = data;
    const limit = pageSize;

    const conditions = [eq(inventoryAlerts.organizationId, ctx.organizationId)];

    if (filters.alertType) {
      conditions.push(eq(inventoryAlerts.alertType, filters.alertType));
    }
    if (filters.productId) {
      conditions.push(eq(inventoryAlerts.productId, filters.productId));
    }
    if (filters.locationId) {
      conditions.push(eq(inventoryAlerts.locationId, filters.locationId));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(inventoryAlerts.isActive, filters.isActive));
    }
    if (filters.triggered) {
      // Filter to alerts that have been triggered recently
      conditions.push(sql`${inventoryAlerts.lastTriggeredAt} > NOW() - INTERVAL '24 hours'`);
    }

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryAlerts)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Get active count
    const [activeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryAlerts)
      .where(
        and(
          eq(inventoryAlerts.organizationId, ctx.organizationId),
          eq(inventoryAlerts.isActive, true)
        )
      );

    const offset = (page - 1) * limit;

    // Build sort order based on params (default to createdAt desc)
    const sortBy = data.sortBy ?? 'createdAt';
    const sortOrder = data.sortOrder ?? 'desc';
    const sortColumn = (() => {
      switch (sortBy) {
        case 'alertType':
          return inventoryAlerts.alertType;
        case 'isActive':
          return inventoryAlerts.isActive;
        case 'lastTriggeredAt':
          return inventoryAlerts.lastTriggeredAt;
        case 'createdAt':
        default:
          return inventoryAlerts.createdAt;
      }
    })();
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const alerts = await db
      .select()
      .from(inventoryAlerts)
      .where(and(...conditions))
      .orderBy(orderDirection(sortColumn))
      .limit(limit)
      .offset(offset);

    // Map alerts - threshold type flows from schema (AlertThreshold = { [x: string]: {}; })
    return {
      alerts: alerts.map((alert) => ({
        ...alert,
        threshold: alert.threshold as AlertThreshold,
      })),
      total,
      page,
      limit,
      hasMore: offset + alerts.length < total,
      activeCount: activeCount?.count ?? 0,
    };
  });

/**
 * Get single alert with details.
 */
export const getAlert = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(z.object({ id: z.string().uuid() })))
  .handler(async ({ data }): Promise<AlertWithDetails> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    const [alert] = await db
      .select()
      .from(inventoryAlerts)
      .where(
        and(eq(inventoryAlerts.id, data.id), eq(inventoryAlerts.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!alert) {
      throw new NotFoundError('Alert not found', 'inventoryAlert');
    }

    // Get related product and location
    const [product, location] = await Promise.all([
      alert.productId
        ? db
            .select()
            .from(products)
            .where(alertProductWhereCondition(alert.productId, ctx.organizationId))
            .limit(1)
            .then((r) => r[0] || null)
        : Promise.resolve(null),
      alert.locationId
        ? db
            .select()
            .from(warehouseLocations)
            .where(alertLocationWhereCondition(alert.locationId, ctx.organizationId))
            .limit(1)
            .then((r) => r[0] || null)
        : Promise.resolve(null),
    ]);

    return {
      ...alert,
      threshold: alert.threshold as AlertThreshold,
      product,
      location,
    };
  });

/**
 * Create a new alert.
 */
export const createAlert = createServerFn({ method: 'POST' })
  .inputValidator(createAlertSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    // Validate product if specified
    if (data.productId) {
      const [product] = await db
        .select()
        .from(products)
        .where(alertProductWhereCondition(data.productId, ctx.organizationId))
        .limit(1);

      if (!product) {
        throw new NotFoundError('Product not found', 'product');
      }
    }

    // Validate location if specified
    if (data.locationId) {
      const [location] = await db
        .select()
        .from(warehouseLocations)
        .where(alertLocationWhereCondition(data.locationId, ctx.organizationId))
        .limit(1);

      if (!location) {
        throw new NotFoundError('Location not found', 'warehouseLocation');
      }
    }

    const [alert] = await db
      .insert(inventoryAlerts)
      .values({
        organizationId: ctx.organizationId,
        ...data,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return { alert };
  });

/**
 * Update an alert.
 */
export const updateAlert = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      data: updateAlertSchema,
    })
  )
  .handler(async ({ data: { id, data } }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    const [existing] = await db
      .select()
      .from(inventoryAlerts)
      .where(
        and(eq(inventoryAlerts.id, id), eq(inventoryAlerts.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Alert not found', 'inventoryAlert');
    }

    // Validate updated product if changing
    if (data.productId !== undefined) {
      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(alertProductWhereCondition(data.productId, ctx.organizationId))
        .limit(1);

      if (!product) {
        throw new NotFoundError('Product not found', 'product');
      }
    }

    // Validate updated location if changing
    if (data.locationId !== undefined) {
      const [location] = await db
        .select({ id: warehouseLocations.id })
        .from(warehouseLocations)
        .where(alertLocationWhereCondition(data.locationId, ctx.organizationId))
        .limit(1);

      if (!location) {
        throw new NotFoundError('Location not found', 'warehouseLocation');
      }
    }

    const [alert] = await db
      .update(inventoryAlerts)
      .set({
        ...data,
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
        version: sql`${inventoryAlerts.version} + 1`,
      })
      .where(
        and(eq(inventoryAlerts.id, id), eq(inventoryAlerts.organizationId, ctx.organizationId))
      )
      .returning();

    return { alert };
  });

/**
 * Delete an alert.
 */
export const deleteAlert = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    const [alert] = await db
      .select()
      .from(inventoryAlerts)
      .where(
        and(eq(inventoryAlerts.id, data.id), eq(inventoryAlerts.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!alert) {
      throw new NotFoundError('Alert not found', 'inventoryAlert');
    }

    await db
      .delete(inventoryAlerts)
      .where(
        and(eq(inventoryAlerts.id, data.id), eq(inventoryAlerts.organizationId, ctx.organizationId))
      );

    return { success: true };
  });

// ============================================================================
// ALERT TRIGGERING
// ============================================================================

/**
 * Get currently triggered alerts.
 */
export const getTriggeredAlerts = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ alerts: TriggeredAlert[]; count: number }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    return getTriggeredInventoryAlerts({ organizationId: ctx.organizationId });
  }
);

/**
 * Check and trigger alerts.
 *
 * @deprecated Use the Trigger.dev scheduled job instead: src/trigger/jobs/check-inventory-alerts.ts
 * This function is kept for backwards compatibility but should not be called directly.
 * The Trigger.dev job runs automatically on a schedule and processes all organizations.
 *
 * @internal
 */
const checkAlertsSchema = z.object({});

export const checkAndTriggerAlerts = createServerFn({ method: 'POST' })
  .inputValidator(checkAlertsSchema)
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    const activeAlerts = await db
      .select()
      .from(inventoryAlerts)
      .where(
        and(
          eq(inventoryAlerts.organizationId, ctx.organizationId),
          eq(inventoryAlerts.isActive, true)
        )
      );

    const now = new Date();

    const alertChecks = await Promise.all(
      activeAlerts.map((alert) => checkInventoryAlertTriggered(ctx.organizationId, alert))
    );

    const triggeredResults = alertChecks
      .map((result, index) => (result ? { alert: activeAlerts[index], result } : null))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    await Promise.all(
      triggeredResults.map(({ alert }) =>
        db
          .update(inventoryAlerts)
          .set({ lastTriggeredAt: now })
          .where(
            and(
              eq(inventoryAlerts.id, alert.id),
              eq(inventoryAlerts.organizationId, ctx.organizationId)
            )
          )
      )
    );

    const triggered = triggeredResults.map(({ result }) => result);

    return {
      checkedCount: activeAlerts.length,
      triggeredCount: triggered.length,
      alerts: triggered,
    };
  });

/**
 * Acknowledge an alert.
 */
export const acknowledgeAlert = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      alertId: z.string().uuid(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    // Fallback alerts are computed read models; there is no alert rule row to mutate.
    if (data.alertId.startsWith('00000000-0000-4000-8000-')) {
      return {
        alert: null,
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        message:
          'Fallback inventory alerts are read-only. Create an alert rule to track and acknowledge this condition.',
      };
    }

    const [alert] = await db
      .select()
      .from(inventoryAlerts)
      .where(
        and(
          eq(inventoryAlerts.id, data.alertId),
          eq(inventoryAlerts.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!alert) {
      throw new NotFoundError('Alert not found', 'inventoryAlert');
    }

    const acknowledgedAt = new Date();

    // Current schema acknowledges the alert rule's active trigger by moving
    // updatedAt past lastTriggeredAt. The next trigger updates lastTriggeredAt
    // and makes the alert visible again.
    const [updated] = await db
      .update(inventoryAlerts)
      .set({
        updatedAt: acknowledgedAt,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(inventoryAlerts.id, data.alertId),
          eq(inventoryAlerts.organizationId, ctx.organizationId)
        )
      )
      .returning();

    return {
      alert: updated,
      acknowledged: true,
      acknowledgedBy: ctx.user.id,
      acknowledgedAt,
    };
  });

// ============================================================================
// ALERT ANALYTICS
// ============================================================================

/**
 * Get alert analytics and trends.
 */
export const getAlertAnalytics = createServerFn({ method: 'GET' })
  .inputValidator(
    normalizeObjectInput(
      z.object({
        days: z.coerce.number().int().min(7).max(365).default(30),
      })
    )
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - data.days);

    // Get alert trigger history
    const alerts = await db
      .select()
      .from(inventoryAlerts)
      .where(eq(inventoryAlerts.organizationId, ctx.organizationId));

    // Group by type
    const byType = alerts.reduce(
      (acc, alert) => {
        if (!acc[alert.alertType]) {
          acc[alert.alertType] = { total: 0, active: 0, triggered: 0 };
        }
        acc[alert.alertType].total++;
        if (alert.isActive) acc[alert.alertType].active++;
        if (alert.lastTriggeredAt && alert.lastTriggeredAt >= startDate) {
          acc[alert.alertType].triggered++;
        }
        return acc;
      },
      {} as Record<string, { total: number; active: number; triggered: number }>
    );

    // Get recently triggered count by day
    const dailyTriggers = await db.execute<{ date: string; count: number }>(
      sql`
        SELECT
          DATE(last_triggered_at) as date,
          COUNT(*) as count
        FROM inventory_alerts
        WHERE organization_id = ${ctx.organizationId}
          AND last_triggered_at >= ${startDate}
          AND last_triggered_at IS NOT NULL
        GROUP BY DATE(last_triggered_at)
        ORDER BY date
      `
    );

    // Summary
    const totalAlerts = alerts.length;
    const activeAlerts = alerts.filter((a) => a.isActive).length;
    const recentlyTriggered = alerts.filter(
      (a) => a.lastTriggeredAt && a.lastTriggeredAt >= startDate
    ).length;

    return {
      summary: {
        totalAlerts,
        activeAlerts,
        inactiveAlerts: totalAlerts - activeAlerts,
        recentlyTriggered,
        periodDays: data.days,
      },
      byType: Object.entries(byType).map(([type, stats]) => ({
        alertType: type,
        ...stats,
      })),
      dailyTriggers: dailyTriggers as unknown as { date: string; count: number }[],
      recommendations: generateAlertRecommendations(byType, data.days),
    };
  });

function generateAlertRecommendations(
  byType: Record<string, { total: number; active: number; triggered: number }>,
  days: number
) {
  const recommendations: Array<{ type: string; message: string; priority: string }> = [];

  // Check for high trigger rates
  for (const [type, stats] of Object.entries(byType)) {
    if (stats.active > 0 && stats.triggered > stats.active * 0.5) {
      recommendations.push({
        type: 'high_trigger_rate',
        message: `${type} alerts triggered ${stats.triggered} times in ${days} days - consider adjusting thresholds`,
        priority: 'medium',
      });
    }
  }

  // Check for inactive alerts
  const totalInactive = Object.values(byType).reduce((sum, s) => sum + (s.total - s.active), 0);
  if (totalInactive > 5) {
    recommendations.push({
      type: 'inactive_alerts',
      message: `${totalInactive} inactive alerts - consider reviewing and removing unnecessary alerts`,
      priority: 'low',
    });
  }

  return recommendations;
}
