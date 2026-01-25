/**
 * Inventory Alerts Server Functions
 *
 * Alert configuration, triggering, and management for inventory monitoring.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, desc, gt, lt, lte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { inventoryAlerts, inventory, products, warehouseLocations } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/constants';
import { NotFoundError } from '@/lib/server/errors';
import {
  createAlertSchema,
  updateAlertSchema,
  alertListQuerySchema,
} from '@/lib/schemas/inventory';

// ============================================================================
// TYPES
// ============================================================================

type AlertRecord = typeof inventoryAlerts.$inferSelect;

interface AlertWithDetails extends AlertRecord {
  product?: typeof products.$inferSelect | null;
  location?: typeof warehouseLocations.$inferSelect | null;
}

interface TriggeredAlert {
  alert: AlertRecord;
  product?: typeof products.$inferSelect | null;
  location?: typeof warehouseLocations.$inferSelect | null;
  currentValue: number;
  thresholdValue: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  affectedItems: Array<{
    inventoryId: string;
    productName: string;
    quantity: number;
  }>;
}

interface ListAlertsResult {
  alerts: AlertRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  activeCount: number;
}

// ============================================================================
// ALERT CRUD
// ============================================================================

/**
 * List alerts with filtering.
 */
export const listAlerts = createServerFn({ method: 'GET' })
  .inputValidator(alertListQuerySchema)
  .handler(async ({ data }): Promise<ListAlertsResult> => {
    const ctx = await withAuth();
    const { page = 1, pageSize = 20, sortBy, sortOrder, ...filters } = data;
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
    const alerts = await db
      .select()
      .from(inventoryAlerts)
      .where(and(...conditions))
      .orderBy(desc(inventoryAlerts.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      alerts,
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
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<AlertWithDetails> => {
    const ctx = await withAuth();

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
            .where(eq(products.id, alert.productId))
            .limit(1)
            .then((r) => r[0] || null)
        : Promise.resolve(null),
      alert.locationId
        ? db
            .select()
            .from(warehouseLocations)
            .where(eq(warehouseLocations.id, alert.locationId))
            .limit(1)
            .then((r) => r[0] || null)
        : Promise.resolve(null),
    ]);

    return {
      ...alert,
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
    const ctx = await withAuth({ permission: PERMISSIONS.INVENTORY.MANAGE });

    // Validate product if specified
    if (data.productId) {
      const [product] = await db
        .select()
        .from(products)
        .where(
          and(eq(products.id, data.productId), eq(products.organizationId, ctx.organizationId))
        )
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
        .where(
          and(
            eq(warehouseLocations.id, data.locationId),
            eq(warehouseLocations.organizationId, ctx.organizationId)
          )
        )
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
    const ctx = await withAuth({ permission: PERMISSIONS.INVENTORY.MANAGE });

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

    const [alert] = await db
      .update(inventoryAlerts)
      .set({
        ...data,
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
        version: sql`${inventoryAlerts.version} + 1`,
      })
      .where(eq(inventoryAlerts.id, id))
      .returning();

    return { alert };
  });

/**
 * Delete an alert.
 */
export const deleteAlert = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.INVENTORY.MANAGE });

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

    await db.delete(inventoryAlerts).where(eq(inventoryAlerts.id, data.id));

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
    const ctx = await withAuth();

    // Get all active alerts
    const activeAlerts = await db
      .select()
      .from(inventoryAlerts)
      .where(
        and(
          eq(inventoryAlerts.organizationId, ctx.organizationId),
          eq(inventoryAlerts.isActive, true)
        )
      );

    // Check all alerts in parallel to avoid sequential N+1 queries
    const alertChecks = await Promise.all(
      activeAlerts.map((alert) => checkAlertTriggered(ctx.organizationId, alert))
    );
    const triggeredAlerts: TriggeredAlert[] = alertChecks.filter(
      (result): result is TriggeredAlert => result !== null
    );

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    triggeredAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
      alerts: triggeredAlerts,
      count: triggeredAlerts.length,
    };
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
export const checkAndTriggerAlerts = createServerFn({ method: 'POST' }).handler(async () => {
  const ctx = await withAuth({ permission: PERMISSIONS.INVENTORY.MANAGE });

  // Get all active alerts
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

  // Check all alerts in parallel
  const alertChecks = await Promise.all(
    activeAlerts.map((alert) => checkAlertTriggered(ctx.organizationId, alert))
  );

  // Filter triggered alerts and update timestamps in parallel
  const triggeredResults = alertChecks
    .map((result, index) => (result ? { alert: activeAlerts[index], result } : null))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Update all triggered alert timestamps in parallel
  await Promise.all(
    triggeredResults.map(({ alert }) =>
      db
        .update(inventoryAlerts)
        .set({ lastTriggeredAt: now })
        .where(eq(inventoryAlerts.id, alert.id))
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
    const ctx = await withAuth();

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

    // For now, just update the timestamp to mark as acknowledged
    // In a full implementation, this would create an acknowledgment record
    const [updated] = await db
      .update(inventoryAlerts)
      .set({
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(inventoryAlerts.id, data.alertId))
      .returning();

    return {
      alert: updated,
      acknowledged: true,
      acknowledgedBy: ctx.user.id,
      acknowledgedAt: new Date(),
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
    z.object({
      days: z.coerce.number().int().min(7).max(365).default(30),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function checkAlertTriggered(
  organizationId: string,
  alert: AlertRecord
): Promise<TriggeredAlert | null> {
  const threshold = alert.threshold as {
    minQuantity?: number;
    maxQuantity?: number;
    daysBeforeExpiry?: number;
    daysWithoutMovement?: number;
    deviationPercentage?: number;
  };

  // Build inventory conditions
  const invConditions = [eq(inventory.organizationId, organizationId)];
  if (alert.productId) {
    invConditions.push(eq(inventory.productId, alert.productId));
  }
  if (alert.locationId) {
    invConditions.push(eq(inventory.locationId, alert.locationId));
  }

  let triggered = false;
  let currentValue = 0;
  let thresholdValue = 0;
  let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
  let message = '';
  let affectedItems: TriggeredAlert['affectedItems'] = [];

  switch (alert.alertType) {
    case 'low_stock':
      if (threshold.minQuantity !== undefined) {
        const items = await db
          .select({
            id: inventory.id,
            productId: inventory.productId,
            productName: products.name,
            quantity: inventory.quantityOnHand,
          })
          .from(inventory)
          .innerJoin(products, eq(inventory.productId, products.id))
          .where(and(...invConditions, lt(inventory.quantityOnHand, threshold.minQuantity)));

        if (items.length > 0) {
          triggered = true;
          currentValue = items[0].quantity ?? 0;
          thresholdValue = threshold.minQuantity;
          severity =
            currentValue === 0 ? 'critical' : currentValue < thresholdValue / 2 ? 'high' : 'medium';
          message = `${items.length} item(s) below minimum stock level of ${threshold.minQuantity}`;
          affectedItems = items.map((i) => ({
            inventoryId: i.id,
            productName: i.productName,
            quantity: i.quantity ?? 0,
          }));
        }
      }
      break;

    case 'out_of_stock':
      const outOfStock = await db
        .select({
          id: inventory.id,
          productId: inventory.productId,
          productName: products.name,
          quantity: inventory.quantityOnHand,
        })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(and(...invConditions, lte(inventory.quantityOnHand, 0)));

      if (outOfStock.length > 0) {
        triggered = true;
        currentValue = 0;
        thresholdValue = 0;
        severity = 'critical';
        message = `${outOfStock.length} item(s) out of stock`;
        affectedItems = outOfStock.map((i) => ({
          inventoryId: i.id,
          productName: i.productName,
          quantity: i.quantity ?? 0,
        }));
      }
      break;

    case 'overstock':
      if (threshold.maxQuantity !== undefined) {
        const overstock = await db
          .select({
            id: inventory.id,
            productId: inventory.productId,
            productName: products.name,
            quantity: inventory.quantityOnHand,
          })
          .from(inventory)
          .innerJoin(products, eq(inventory.productId, products.id))
          .where(and(...invConditions, gt(inventory.quantityOnHand, threshold.maxQuantity)));

        if (overstock.length > 0) {
          triggered = true;
          currentValue = overstock[0].quantity ?? 0;
          thresholdValue = threshold.maxQuantity;
          severity = 'medium';
          message = `${overstock.length} item(s) above maximum stock level of ${threshold.maxQuantity}`;
          affectedItems = overstock.map((i) => ({
            inventoryId: i.id,
            productName: i.productName,
            quantity: i.quantity ?? 0,
          }));
        }
      }
      break;

    case 'expiry':
      if (threshold.daysBeforeExpiry !== undefined) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + threshold.daysBeforeExpiry);

        const expiring = await db
          .select({
            id: inventory.id,
            productId: inventory.productId,
            productName: products.name,
            quantity: inventory.quantityOnHand,
          })
          .from(inventory)
          .innerJoin(products, eq(inventory.productId, products.id))
          .where(
            and(
              ...invConditions,
              sql`${inventory.expiryDate}::date <= ${expiryDate.toISOString().split('T')[0]}::date`,
              sql`${inventory.expiryDate} IS NOT NULL`
            )
          );

        if (expiring.length > 0) {
          triggered = true;
          currentValue = threshold.daysBeforeExpiry;
          thresholdValue = threshold.daysBeforeExpiry;
          severity = threshold.daysBeforeExpiry <= 7 ? 'high' : 'medium';
          message = `${expiring.length} item(s) expiring within ${threshold.daysBeforeExpiry} days`;
          affectedItems = expiring.map((i) => ({
            inventoryId: i.id,
            productName: i.productName,
            quantity: i.quantity ?? 0,
          }));
        }
      }
      break;

    case 'slow_moving':
      if (threshold.daysWithoutMovement !== undefined) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - threshold.daysWithoutMovement);

        // Find items with no movements in the period
        const slowMoving = await db.execute<{
          id: string;
          productName: string;
          quantity: number;
        }>(
          sql`
            SELECT i.id, p.name as product_name, i.quantity_on_hand as quantity
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE i.organization_id = ${organizationId}
              ${alert.productId ? sql`AND i.product_id = ${alert.productId}` : sql``}
              ${alert.locationId ? sql`AND i.location_id = ${alert.locationId}` : sql``}
              AND i.quantity_on_hand > 0
              AND NOT EXISTS (
                SELECT 1 FROM inventory_movements m
                WHERE m.inventory_id = i.id
                  AND m.created_at >= ${cutoffDate}
              )
          `
        );

        const slowItems = slowMoving as unknown as {
          id: string;
          productName: string;
          quantity: number;
        }[];
        if (slowItems.length > 0) {
          triggered = true;
          currentValue = threshold.daysWithoutMovement;
          thresholdValue = threshold.daysWithoutMovement;
          severity = threshold.daysWithoutMovement >= 90 ? 'high' : 'medium';
          message = `${slowItems.length} item(s) with no movement in ${threshold.daysWithoutMovement} days`;
          affectedItems = slowItems.map((i) => ({
            inventoryId: i.id,
            productName: i.productName,
            quantity: i.quantity,
          }));
        }
      }
      break;

    case 'forecast_deviation':
      // This would compare actual vs forecast - simplified for now
      break;
  }

  if (!triggered) return null;

  // Get product and location details
  const [product, location] = await Promise.all([
    alert.productId
      ? db
          .select()
          .from(products)
          .where(eq(products.id, alert.productId))
          .limit(1)
          .then((r) => r[0] || null)
      : Promise.resolve(null),
    alert.locationId
      ? db
          .select()
          .from(warehouseLocations)
          .where(eq(warehouseLocations.id, alert.locationId))
          .limit(1)
          .then((r) => r[0] || null)
      : Promise.resolve(null),
  ]);

  return {
    alert,
    product,
    location,
    currentValue,
    thresholdValue,
    severity,
    message,
    affectedItems: affectedItems.slice(0, 10), // Limit to 10 items
  };
}

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
