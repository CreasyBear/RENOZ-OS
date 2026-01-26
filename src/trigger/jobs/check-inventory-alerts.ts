/**
 * Check Inventory Alerts Job
 *
 * Scheduled cron job that runs every 30 minutes to check for inventory
 * alert conditions and trigger notifications when thresholds are exceeded.
 *
 * This replaces the public server function that required auth context.
 * The job iterates through all organizations to process their inventory alerts.
 *
 * @see src/server/functions/inventory/alerts.ts (original function removed)
 */
import { schedules } from '@trigger.dev/sdk/v3';
import { and, eq, lt, gt, lte, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  inventoryAlerts,
  inventory,
  products,
  organizations,
  notifications,
  users,
} from 'drizzle/schema';

// ============================================================================
// TYPES
// ============================================================================

type AlertRecord = typeof inventoryAlerts.$inferSelect;

interface TriggeredAlert {
  alertId: string;
  alertName: string;
  alertType: string;
  currentValue: number;
  thresholdValue: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  affectedItems: Array<{
    id: string;
    productId: string;
    productName: string | null;
    quantity: number;
  }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if an alert condition is triggered
 */
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
          currentValue = items[0].quantity;
          thresholdValue = threshold.minQuantity;
          severity = currentValue <= 0 ? 'critical' : currentValue < threshold.minQuantity / 2 ? 'high' : 'medium';
          message = `${items.length} item(s) below minimum stock level of ${threshold.minQuantity}`;
          affectedItems = items.map((i) => ({
            id: i.id,
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
          }));
        }
      }
      break;

    case 'overstock':
      if (threshold.maxQuantity !== undefined) {
        const items = await db
          .select({
            id: inventory.id,
            productId: inventory.productId,
            productName: products.name,
            quantity: inventory.quantityOnHand,
          })
          .from(inventory)
          .innerJoin(products, eq(inventory.productId, products.id))
          .where(and(...invConditions, gt(inventory.quantityOnHand, threshold.maxQuantity)));

        if (items.length > 0) {
          triggered = true;
          currentValue = items[0].quantity;
          thresholdValue = threshold.maxQuantity;
          severity = 'medium';
          message = `${items.length} item(s) above maximum stock level of ${threshold.maxQuantity}`;
          affectedItems = items.map((i) => ({
            id: i.id,
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
          }));
        }
      }
      break;

    case 'out_of_stock':
      if (threshold.minQuantity !== undefined) {
        const items = await db
          .select({
            id: inventory.id,
            productId: inventory.productId,
            productName: products.name,
            quantity: inventory.quantityAvailable,
          })
          .from(inventory)
          .innerJoin(products, eq(inventory.productId, products.id))
          .where(and(...invConditions, lte(inventory.quantityAvailable, threshold.minQuantity)));

        if (items.length > 0) {
          triggered = true;
          currentValue = items[0].quantity;
          thresholdValue = threshold.minQuantity;
          severity = 'critical';
          message = `${items.length} item(s) out of stock or below available threshold of ${threshold.minQuantity}`;
          affectedItems = items.map((i) => ({
            id: i.id,
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
          }));
        }
      }
      break;

    default:
      break;
  }

  if (!triggered) {
    return null;
  }

  return {
    alertId: alert.id,
    alertName: `${alert.alertType} alert`,
    alertType: alert.alertType,
    currentValue,
    thresholdValue,
    severity,
    message,
    affectedItems,
  };
}

/**
 * Send notification for triggered alert
 */
async function notifyAlert(
  organizationId: string,
  alert: TriggeredAlert
) {
  // Get organization admins and managers to notify
  const usersToNotify = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        isNull(users.deletedAt)
      )
    )
    .limit(10);

  for (const user of usersToNotify) {
    await db.insert(notifications).values({
      organizationId,
      userId: user.id,
      type: 'inventory',
      title: `Inventory Alert: ${alert.alertName}`,
      message: alert.message,
      data: {
        entityId: alert.alertId,
        entityType: 'inventory_alert',
        subType: alert.alertType,
        severity: alert.severity,
        affectedItemsCount: alert.affectedItems.length,
      },
      status: 'pending',
    });
  }
}

// ============================================================================
// CHECK INVENTORY ALERTS TASK
// ============================================================================

/**
 * Task that checks all inventory alerts across all organizations
 * and triggers notifications when conditions are met.
 */
export const checkInventoryAlertsTask = schedules.task({
  id: 'check-inventory-alerts',
  cron: '*/30 * * * *',
  run: async () => {
    console.log('Starting inventory alerts check');

    const now = new Date();
    let totalChecked = 0;
    let totalTriggered = 0;

    // Get all active organizations
    const orgs = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(isNull(organizations.deletedAt));

    console.log(`Checking ${orgs.length} organizations for inventory alerts`);

    for (const org of orgs) {
      // Get all active alerts for this organization
      const activeAlerts = await db
        .select()
        .from(inventoryAlerts)
        .where(
          and(
            eq(inventoryAlerts.organizationId, org.id),
            eq(inventoryAlerts.isActive, true)
          )
        );

      totalChecked += activeAlerts.length;

      // Check all alerts in parallel
      const alertChecks = await Promise.all(
        activeAlerts.map((alert) => checkAlertTriggered(org.id, alert))
      );

      // Filter triggered alerts
      const triggeredAlerts = alertChecks.filter(
        (result): result is TriggeredAlert => result !== null
      );

      // Update timestamps and send notifications for triggered alerts
      for (const triggered of triggeredAlerts) {
        await db
          .update(inventoryAlerts)
          .set({ lastTriggeredAt: now })
          .where(eq(inventoryAlerts.id, triggered.alertId));

        await notifyAlert(org.id, triggered);

        console.log(`Alert triggered: ${triggered.alertName} - ${triggered.message}`);
        totalTriggered++;
      }
    }

    console.log(`Inventory alerts check completed. Checked: ${totalChecked}, Triggered: ${totalTriggered}`);

    return {
      success: true,
      totalChecked,
      totalTriggered,
      organizationsChecked: orgs.length,
    };
  },
});

