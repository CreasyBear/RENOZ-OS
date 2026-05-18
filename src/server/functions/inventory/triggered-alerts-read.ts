import { and, asc, eq, gt, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inventoryLogger } from '@/lib/logger';
import {
  inventory,
  inventoryAlerts,
  products,
  warehouseLocations,
} from 'drizzle/schema';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  type AlertThreshold,
  type TriggeredAlert,
} from '@/lib/schemas/inventory';
import { allocatableQuantitySumSql } from './_allocatable-stock-sql';
import {
  alertInventoryProductJoinCondition,
  alertProductWhereCondition,
} from './alert-query-conditions';

export type InventoryAlertRecord = typeof inventoryAlerts.$inferSelect;

interface GetTriggeredInventoryAlertsInput {
  organizationId: string;
}

export async function getTriggeredInventoryAlerts({
  organizationId,
}: GetTriggeredInventoryAlertsInput): Promise<{ alerts: TriggeredAlert[]; count: number }> {
  const activeAlerts = await db
    .select()
    .from(inventoryAlerts)
    .where(
      and(
        eq(inventoryAlerts.organizationId, organizationId),
        eq(inventoryAlerts.isActive, true)
      )
    );

  const alertChecks = await Promise.all(
    activeAlerts.map((alert) => checkInventoryAlertTriggered(organizationId, alert))
  );
  let triggeredAlerts: TriggeredAlert[] = alertChecks.filter(
    (result): result is TriggeredAlert => result !== null
  );

  if (activeAlerts.length === 0) {
    triggeredAlerts = await getFallbackLowStockAlerts(organizationId);
  }

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  triggeredAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    alerts: triggeredAlerts,
    count: triggeredAlerts.length,
  };
}

async function getFallbackLowStockAlerts(organizationId: string): Promise<TriggeredAlert[]> {
  try {
    const lowStockGroups = await db
      .select({
        productId: inventory.productId,
        productName: products.name,
        productSku: products.sku,
        locationId: inventory.locationId,
        locationName: warehouseLocations.name,
        locationCode: warehouseLocations.locationCode,
        totalQuantity: allocatableQuantitySumSql(),
        itemCount: sql<number>`COUNT(*)::int`,
      })
      .from(inventory)
      .innerJoin(products, alertInventoryProductJoinCondition(organizationId))
      .leftJoin(
        warehouseLocations,
        and(
          eq(inventory.locationId, warehouseLocations.id),
          eq(warehouseLocations.organizationId, organizationId)
        )
      )
      .where(eq(inventory.organizationId, organizationId))
      .groupBy(
        inventory.productId,
        products.name,
        products.sku,
        inventory.locationId,
        warehouseLocations.name,
        warehouseLocations.locationCode
      )
      .having(sql`${allocatableQuantitySumSql()} < ${DEFAULT_LOW_STOCK_THRESHOLD}`)
      .limit(50);

    if (lowStockGroups.length === 0) {
      return [];
    }

    const topGroups = lowStockGroups.slice(0, 20);
    const productLocationPairs = topGroups.map((group) => ({
      productId: group.productId,
      locationId: group.locationId,
    }));
    const affectedItemsMap = new Map<
      string,
      Array<{ inventoryId: string; productName: string; quantity: number }>
    >();

    if (productLocationPairs.length > 0) {
      const pairMap = new Map<string, Set<string>>();
      for (const pair of productLocationPairs) {
        if (!pairMap.has(pair.productId)) {
          pairMap.set(pair.productId, new Set());
        }
        pairMap.get(pair.productId)!.add(pair.locationId);
      }

      const pairConditions = productLocationPairs.map((pair) =>
        and(eq(inventory.productId, pair.productId), eq(inventory.locationId, pair.locationId))
      );

      const allItems = await db
        .select({
          id: inventory.id,
          productId: inventory.productId,
          locationId: inventory.locationId,
          productName: products.name,
          quantityAvailable: inventory.quantityAvailable,
        })
        .from(inventory)
        .innerJoin(products, alertInventoryProductJoinCondition(organizationId))
        .where(
          and(
            eq(inventory.organizationId, organizationId),
            eq(inventory.status, 'available'),
            or(...pairConditions)
          )
        )
        .orderBy(asc(inventory.productId), asc(inventory.locationId), asc(inventory.quantityAvailable));

      const groupedItems = new Map<string, typeof allItems>();
      for (const item of allItems) {
        const key = `${item.productId}-${item.locationId}`;
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

      for (const [key, items] of groupedItems.entries()) {
        affectedItemsMap.set(
          key,
          items.map((item) => ({
            inventoryId: item.id,
            productName: item.productName || 'Unknown Product',
            quantity: Number(item.quantityAvailable) || 0,
          }))
        );
      }
    }

    return lowStockGroups.map((group) => {
      const currentValue = Number(group.totalQuantity) || 0;
      const thresholdValue = DEFAULT_LOW_STOCK_THRESHOLD;
      const severity: 'critical' | 'high' | 'medium' | 'low' =
        currentValue === 0 ? 'critical' : currentValue < thresholdValue / 2 ? 'high' : 'medium';
      const key = `${group.productId}-${group.locationId}`;
      let hash = 0;
      for (let i = 0; i < key.length; i++) {
        const char = key.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      const hashHex = Math.abs(hash).toString(16).padStart(12, '0').slice(0, 12);
      const fallbackId =
        `00000000-0000-4000-8000-${hashHex}` as `${string}-${string}-${string}-${string}-${string}`;
      const message = `${group.itemCount} item(s) below minimum stock level of ${thresholdValue} (${currentValue} available)`;

      return {
        alert: {
          id: fallbackId,
          organizationId,
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
        isFallback: true,
      };
    });
  } catch (error) {
    inventoryLogger.error('Failed to fetch fallback low stock alerts', error as Error, {});
    return [];
  }
}

export async function checkInventoryAlertTriggered(
  organizationId: string,
  alert: InventoryAlertRecord
): Promise<TriggeredAlert | null> {
  const threshold = alert.threshold as AlertThreshold & {
    minQuantity?: number;
    maxQuantity?: number;
    daysBeforeExpiry?: number;
    daysWithoutMovement?: number;
    deviationPercentage?: number;
  };

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
        const aggregated = await db
          .select({
            productId: inventory.productId,
            productName: products.name,
            productSku: products.sku,
            locationId: inventory.locationId,
            locationName: warehouseLocations.name,
            totalQuantity: allocatableQuantitySumSql(),
            itemCount: sql<number>`COUNT(*)::int`,
          })
          .from(inventory)
          .innerJoin(products, alertInventoryProductJoinCondition(organizationId))
          .leftJoin(
            warehouseLocations,
            and(
              eq(inventory.locationId, warehouseLocations.id),
              eq(warehouseLocations.organizationId, organizationId)
            )
          )
          .where(and(...invConditions))
          .groupBy(
            inventory.productId,
            products.name,
            products.sku,
            inventory.locationId,
            warehouseLocations.name
          )
          .having(sql`${allocatableQuantitySumSql()} < ${threshold.minQuantity}`);

        if (aggregated.length > 0) {
          triggered = true;
          currentValue = Math.min(...aggregated.map((item) => Number(item.totalQuantity) || 0));
          thresholdValue = threshold.minQuantity;
          severity =
            currentValue === 0 ? 'critical' : currentValue < thresholdValue / 2 ? 'high' : 'medium';
          message = `${aggregated.length} product(s) below minimum stock level of ${threshold.minQuantity} (${currentValue} available)`;

          const firstGroup = aggregated[0];
          const sampleItems = await db
            .select({
              id: inventory.id,
              productName: products.name,
              quantity: inventory.quantityAvailable,
            })
            .from(inventory)
            .innerJoin(products, alertInventoryProductJoinCondition(organizationId))
            .where(
              and(
                eq(inventory.organizationId, organizationId),
                eq(inventory.status, 'available'),
                eq(inventory.productId, firstGroup.productId),
                eq(inventory.locationId, firstGroup.locationId)
              )
            )
            .limit(10);

          affectedItems = sampleItems.map((item) => ({
            inventoryId: item.id,
            productName: item.productName || 'Unknown Product',
            quantity: Number(item.quantity) || 0,
          }));
        }
      }
      break;

    case 'out_of_stock': {
      const outOfStockAggregated = await db
        .select({
          productId: inventory.productId,
          productName: products.name,
          productSku: products.sku,
          locationId: inventory.locationId,
          locationName: warehouseLocations.name,
          totalQuantity: allocatableQuantitySumSql(),
          itemCount: sql<number>`COUNT(*)::int`,
        })
        .from(inventory)
        .innerJoin(products, alertInventoryProductJoinCondition(organizationId))
        .leftJoin(
          warehouseLocations,
          and(
            eq(inventory.locationId, warehouseLocations.id),
            eq(warehouseLocations.organizationId, organizationId)
          )
        )
        .where(and(...invConditions))
        .groupBy(
          inventory.productId,
          products.name,
          products.sku,
          inventory.locationId,
          warehouseLocations.name
        )
        .having(sql`${allocatableQuantitySumSql()} <= 0`);

      if (outOfStockAggregated.length > 0) {
        triggered = true;
        currentValue = 0;
        thresholdValue = 0;
        severity = 'critical';
        message = `${outOfStockAggregated.length} product(s) out of stock (0 available)`;

        const firstGroup = outOfStockAggregated[0];
        const sampleItems = await db
          .select({
            id: inventory.id,
            productName: products.name,
            quantity: inventory.quantityAvailable,
          })
          .from(inventory)
          .innerJoin(products, alertInventoryProductJoinCondition(organizationId))
          .where(
            and(
              eq(inventory.organizationId, organizationId),
              eq(inventory.status, 'available'),
              eq(inventory.productId, firstGroup.productId),
              eq(inventory.locationId, firstGroup.locationId)
            )
          )
          .limit(10);

        affectedItems = sampleItems.map((item) => ({
          inventoryId: item.id,
          productName: item.productName || 'Unknown Product',
          quantity: Number(item.quantity) || 0,
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
          .innerJoin(products, alertInventoryProductJoinCondition(organizationId))
          .where(and(...invConditions, gt(inventory.quantityOnHand, threshold.maxQuantity)));

        if (overstock.length > 0) {
          triggered = true;
          currentValue = overstock[0].quantity ?? 0;
          thresholdValue = threshold.maxQuantity;
          severity = 'medium';
          message = `${overstock.length} item(s) above maximum stock level of ${threshold.maxQuantity}`;
          affectedItems = overstock.map((item) => ({
            inventoryId: item.id,
            productName: item.productName,
            quantity: item.quantity ?? 0,
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
          .innerJoin(products, alertInventoryProductJoinCondition(organizationId))
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
          affectedItems = expiring.map((item) => ({
            inventoryId: item.id,
            productName: item.productName,
            quantity: item.quantity ?? 0,
          }));
        }
      }
      break;

    case 'slow_moving':
      if (threshold.daysWithoutMovement !== undefined) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - threshold.daysWithoutMovement);

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
              AND p.organization_id = ${organizationId}
              AND p.deleted_at IS NULL
              ${alert.productId ? sql`AND i.product_id = ${alert.productId}` : sql``}
              ${alert.locationId ? sql`AND i.location_id = ${alert.locationId}` : sql``}
              AND i.quantity_on_hand > 0
              AND NOT EXISTS (
                SELECT 1 FROM inventory_movements m
                WHERE m.inventory_id = i.id
                  AND m.organization_id = ${organizationId}
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
          affectedItems = slowItems.map((item) => ({
            inventoryId: item.id,
            productName: item.productName,
            quantity: item.quantity,
          }));
        }
      }
      break;

    case 'forecast_deviation':
      break;
  }

  if (!triggered) return null;

  const [product, location] = await Promise.all([
    alert.productId
      ? db
          .select()
          .from(products)
          .where(alertProductWhereCondition(alert.productId, organizationId))
          .limit(1)
          .then((rows) => rows[0] || null)
      : Promise.resolve(null),
    alert.locationId
      ? db
          .select()
          .from(warehouseLocations)
          .where(
            and(
              eq(warehouseLocations.id, alert.locationId),
              eq(warehouseLocations.organizationId, organizationId)
            )
          )
          .limit(1)
          .then((rows) => rows[0] || null)
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
    affectedItems: affectedItems.slice(0, 10),
  };
}
