/**
 * Inventory Alerts Server Functions
 *
 * Alert configuration, triggering, and management for inventory monitoring.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { eq, and, or, sql, desc, asc, gt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { inventoryAlerts, inventory, products, warehouseLocations } from 'drizzle/schema';
import type { AlertThreshold } from '@/lib/schemas/inventory';
import { withAuth } from '@/lib/server/protected';
import { inventoryLogger } from '@/lib/logger';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError } from '@/lib/server/errors';
import {
  createAlertSchema,
  updateAlertSchema,
  alertListQuerySchema,
  DEFAULT_LOW_STOCK_THRESHOLD,
  type AlertWithDetails,
  type TriggeredAlert,
  type ListAlertsResult,
} from '@/lib/schemas/inventory';

// ============================================================================
// TYPES
// ============================================================================

type AlertRecord = typeof inventoryAlerts.$inferSelect;

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
    let triggeredAlerts: TriggeredAlert[] = alertChecks.filter(
      (result): result is TriggeredAlert => result !== null
    );

    // If no alert rules exist, provide fallback low stock alerts based on quantityAvailable < 10
    // This ensures consistency with the inventory index page which uses the same threshold
    // Fallback alerts are read-only and cannot be acknowledged (they don't exist in DB)
    if (activeAlerts.length === 0) {
      try {
        // Use SQL GROUP BY for efficient aggregation by SKU (product) + location
        // Inventory table stores individual items (lots, serials), but alerts should be by SKU
        // Threshold matches inventory index page: SUM(quantityAvailable) < DEFAULT_LOW_STOCK_THRESHOLD
        const lowStockGroups = await db
          .select({
            productId: inventory.productId,
            productName: products.name,
            productSku: products.sku,
            locationId: inventory.locationId,
            locationName: warehouseLocations.name,
            locationCode: warehouseLocations.locationCode,
            totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityAvailable}), 0)::numeric`,
            itemCount: sql<number>`COUNT(*)::int`,
          })
          .from(inventory)
          .innerJoin(products, eq(inventory.productId, products.id))
          .leftJoin(warehouseLocations, eq(inventory.locationId, warehouseLocations.id))
          .where(eq(inventory.organizationId, ctx.organizationId))
          .groupBy(
            inventory.productId,
            products.name,
            products.sku,
            inventory.locationId,
            warehouseLocations.name,
            warehouseLocations.locationCode
          )
          .having(sql`COALESCE(SUM(${inventory.quantityAvailable}), 0) < ${DEFAULT_LOW_STOCK_THRESHOLD}`)
          .limit(50); // Limit groups to prevent performance issues

        if (lowStockGroups.length > 0) {
          // Batch fetch affected items for all groups in a single query (performance optimization)
          // Get sample items for display - limit to first 20 groups and 5 items per group
          const topGroups = lowStockGroups.slice(0, 20);
          const productLocationPairs = topGroups.map((g) => ({
            productId: g.productId,
            locationId: g.locationId,
          }));

          const affectedItemsMap = new Map<string, Array<{ inventoryId: string; productName: string; quantity: number }>>();

          if (productLocationPairs.length > 0) {
            // Build OR conditions for batch fetch - more efficient than N+1 queries
            // Build a map for quick lookup to filter results
            const pairMap = new Map<string, Set<string>>();
            for (const pair of productLocationPairs) {
              if (!pairMap.has(pair.productId)) {
                pairMap.set(pair.productId, new Set());
              }
              pairMap.get(pair.productId)!.add(pair.locationId);
            }

            // Build OR conditions for each product+location pair
            const pairConditions = productLocationPairs.map((pair) =>
              and(
                eq(inventory.productId, pair.productId),
                eq(inventory.locationId, pair.locationId)
              )
            );

            // Fetch all items for these groups in one query using OR
            const allItems = await db
              .select({
                id: inventory.id,
                productId: inventory.productId,
                locationId: inventory.locationId,
                productName: products.name,
                quantityAvailable: inventory.quantityAvailable,
              })
              .from(inventory)
              .innerJoin(products, eq(inventory.productId, products.id))
              .where(
                and(
                  eq(inventory.organizationId, ctx.organizationId),
                  or(...pairConditions)
                )
              )
              .orderBy(asc(inventory.productId), asc(inventory.locationId), asc(inventory.quantityAvailable));

            // Group items by product+location and limit to 5 per group
            // Filter to only include valid product+location pairs
            const groupedItems = new Map<string, typeof allItems>();
            for (const item of allItems) {
              const key = `${item.productId}-${item.locationId}`;
              // Only include if this is a valid pair from our groups
              const validLocations = pairMap.get(item.productId);
              if (validLocations && validLocations.has(item.locationId)) {
                if (!groupedItems.has(key)) {
                  groupedItems.set(key, []);
                }
                const group = groupedItems.get(key)!;
                if (group.length < 5) {
                  group.push(item);
                }
              }
            }

            // Convert to affectedItems format
            for (const [key, items] of groupedItems.entries()) {
              affectedItemsMap.set(
                key,
                items.map((i) => ({
                  inventoryId: i.id,
                  productName: i.productName || 'Unknown Product',
                  quantity: Number(i.quantityAvailable) || 0,
                }))
              );
            }
          }

          triggeredAlerts = lowStockGroups.map((group) => {
            const currentValue = Number(group.totalQuantity) || 0;
            const thresholdValue = DEFAULT_LOW_STOCK_THRESHOLD;
            const severity: 'critical' | 'high' | 'medium' | 'low' =
              currentValue === 0 ? 'critical' : currentValue < thresholdValue / 2 ? 'high' : 'medium';

            // Generate a valid UUID v4 format for fallback alerts
            // Prefix with '00000000-0000-4000-8000-' to identify them as fallback alerts
            // These alerts cannot be acknowledged as they don't exist in the database
            const key = `${group.productId}-${group.locationId}`;
            // Create a deterministic hash from product+location key
            let hash = 0;
            for (let i = 0; i < key.length; i++) {
              const char = key.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32-bit integer
            }
            // Convert to hex and pad to 12 characters for UUID format
            const hashHex = Math.abs(hash).toString(16).padStart(12, '0').slice(0, 12);
            const fallbackId = `00000000-0000-4000-8000-${hashHex}` as `${string}-${string}-${string}-${string}-${string}`;
            
            // Standardized message format matching real alerts
            const message = `${group.itemCount} item(s) below minimum stock level of ${thresholdValue} (${currentValue} available)`;
            
            return {
              alert: {
                id: fallbackId,
                organizationId: ctx.organizationId,
                alertType: 'low_stock' as const,
                productId: group.productId,
                locationId: group.locationId,
                threshold: { minQuantity: thresholdValue } as AlertThreshold,
                isActive: true,
                notificationChannels: [],
                escalationUsers: [],
                lastTriggeredAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: null,
                updatedBy: null,
                version: 1,
              },
              product: group.productName
                ? {
                    id: group.productId,
                    name: group.productName,
                    sku: group.productSku || '',
                  }
                : null,
              location: group.locationName
                ? {
                    id: group.locationId,
                    name: group.locationName,
                    locationCode: group.locationCode || '',
                  }
                : null,
              currentValue,
              thresholdValue,
              severity,
              message,
              affectedItems: affectedItemsMap.get(key) || [],
              // Flag to distinguish fallback alerts
              isFallback: true,
            };
          });
        }
      } catch (error) {
        // Log error but don't fail the entire function
        // Fallback alerts are optional - if they fail, return empty array
        inventoryLogger.error('Failed to fetch fallback low stock alerts', error as Error, {});
        // Continue with empty triggeredAlerts array
      }
    }

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
const checkAlertsSchema = z.object({});

export const checkAndTriggerAlerts = createServerFn({ method: 'POST' })
  .inputValidator(checkAlertsSchema)
  .handler(async () => {
  const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

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

    // Check if this is a fallback alert (IDs starting with '00000000-0000-4000-8000-')
    // Fallback alerts cannot be acknowledged as they don't exist in the database
    if (data.alertId.startsWith('00000000-0000-4000-8000-')) {
      // Return success but indicate this is a fallback alert that cannot be persisted
      return {
        alert: null,
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        message: 'Fallback alerts cannot be acknowledged. Please create an alert rule to track this item.',
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
  // Threshold type flows from schema (AlertThreshold = { [x: string]: {}; })
  // Access properties with type assertion for runtime access
  const threshold = alert.threshold as AlertThreshold & {
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
        // Aggregate by product+location (SKU) since inventory table stores individual items
        // Use quantityAvailable (not quantityOnHand) to match index page logic
        // quantityAvailable = quantityOnHand - quantityAllocated
        const aggregated = await db
          .select({
            productId: inventory.productId,
            productName: products.name,
            productSku: products.sku,
            locationId: inventory.locationId,
            locationName: warehouseLocations.name,
            totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityAvailable}), 0)::numeric`,
            itemCount: sql<number>`COUNT(*)::int`,
          })
          .from(inventory)
          .innerJoin(products, eq(inventory.productId, products.id))
          .leftJoin(warehouseLocations, eq(inventory.locationId, warehouseLocations.id))
          .where(and(...invConditions))
          .groupBy(
            inventory.productId,
            products.name,
            products.sku,
            inventory.locationId,
            warehouseLocations.name
          )
          .having(sql`COALESCE(SUM(${inventory.quantityAvailable}), 0) < ${threshold.minQuantity}`);

        if (aggregated.length > 0) {
          triggered = true;
          // Use the minimum total quantity across all matching product+location combinations
          currentValue = Math.min(...aggregated.map((a) => Number(a.totalQuantity) || 0));
          thresholdValue = threshold.minQuantity;
          severity =
            currentValue === 0 ? 'critical' : currentValue < thresholdValue / 2 ? 'high' : 'medium';
              message = `${aggregated.length} product(s) below minimum stock level of ${threshold.minQuantity} (${currentValue} available)`;
          
          // Get sample affected items for the first aggregated group (for display)
          if (aggregated.length > 0) {
            const firstGroup = aggregated[0];
            const sampleItems = await db
              .select({
                id: inventory.id,
                productName: products.name,
                quantity: inventory.quantityAvailable,
              })
              .from(inventory)
              .innerJoin(products, eq(inventory.productId, products.id))
              .where(
                and(
                  eq(inventory.organizationId, organizationId),
                  eq(inventory.productId, firstGroup.productId),
                  eq(inventory.locationId, firstGroup.locationId)
                )
              )
              .limit(10);
            
            affectedItems = sampleItems.map((i) => ({
              inventoryId: i.id,
              productName: i.productName || 'Unknown Product',
              quantity: Number(i.quantity) || 0,
            }));
          }
        }
      }
      break;

    case 'out_of_stock': {
      // Aggregate by product+location (SKU) since inventory table stores individual items
      // Use quantityAvailable to check if stock is available for new orders
      const outOfStockAggregated = await db
        .select({
          productId: inventory.productId,
          productName: products.name,
          productSku: products.sku,
          locationId: inventory.locationId,
          locationName: warehouseLocations.name,
          totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityAvailable}), 0)::numeric`,
          itemCount: sql<number>`COUNT(*)::int`,
        })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .leftJoin(warehouseLocations, eq(inventory.locationId, warehouseLocations.id))
        .where(and(...invConditions))
        .groupBy(
          inventory.productId,
          products.name,
          products.sku,
          inventory.locationId,
          warehouseLocations.name
        )
        .having(sql`COALESCE(SUM(${inventory.quantityAvailable}), 0) <= 0`);

      if (outOfStockAggregated.length > 0) {
        triggered = true;
        currentValue = 0;
        thresholdValue = 0;
        severity = 'critical';
        message = `${outOfStockAggregated.length} product(s) out of stock (0 available)`;
        
        // Get sample affected items for the first aggregated group (for display)
        const firstGroup = outOfStockAggregated[0];
        const sampleItems = await db
          .select({
            id: inventory.id,
            productName: products.name,
            quantity: inventory.quantityAvailable,
          })
          .from(inventory)
          .innerJoin(products, eq(inventory.productId, products.id))
          .where(
            and(
              eq(inventory.organizationId, organizationId),
              eq(inventory.productId, firstGroup.productId),
              eq(inventory.locationId, firstGroup.locationId)
            )
          )
          .limit(10);
        
        affectedItems = sampleItems.map((i) => ({
          inventoryId: i.id,
          productName: i.productName || 'Unknown Product',
          quantity: Number(i.quantity) || 0,
        }));
      }
      break;
    }

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
    alert: {
      ...alert,
      threshold: alert.threshold as AlertThreshold,
    },
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
