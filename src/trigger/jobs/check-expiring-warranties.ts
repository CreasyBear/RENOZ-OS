/**
 * Check Expiring Warranties Job
 *
 * Scheduled cron job that runs daily to check for warranties approaching expiry.
 * Creates notification records and triggers expiry reminder emails at
 * configurable intervals (30/60/90 days by default).
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003a
 * @see src/trigger/jobs/warranty-notifications.ts for email sending
 */
import { cronTrigger, eventTrigger } from '@trigger.dev/sdk';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { warranties, warrantyPolicies, customers, notifications } from 'drizzle/schema';
import { client, warrantyEvents, type WarrantyExpiringSoonPayload } from '../client';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default expiry alert intervals in days.
 * Customers receive alerts at these thresholds before warranty expiry.
 */
const DEFAULT_ALERT_INTERVALS = [90, 60, 30] as const;

/**
 * Base URL for generating renewal/extension links
 * In production, this would come from environment variables
 */
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://app.renoz.energy';

// ============================================================================
// HELPER TYPES
// ============================================================================

// ExpiringWarranty type is inferred from the query result

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine which alert interval this warranty falls into.
 * Returns null if warranty doesn't fall within any alert threshold.
 */
function getAlertInterval(
  daysUntilExpiry: number,
  lastAlertSent: Date | null,
  intervals: readonly number[] = DEFAULT_ALERT_INTERVALS
): number | null {
  // Sort intervals descending (90, 60, 30)
  const sortedIntervals = [...intervals].sort((a, b) => b - a);

  for (const interval of sortedIntervals) {
    // Check if we're within this interval window
    // e.g., for 90-day interval, window is 90-61 days
    const nextInterval = sortedIntervals[sortedIntervals.indexOf(interval) + 1];
    const lowerBound = nextInterval ?? 0;

    if (daysUntilExpiry <= interval && daysUntilExpiry > lowerBound) {
      // Check if we already sent an alert for this interval
      if (lastAlertSent) {
        const daysSinceLastAlert = Math.floor(
          (Date.now() - lastAlertSent.getTime()) / (1000 * 60 * 60 * 24)
        );
        // Don't send again if we sent within the interval
        // e.g., if 90-day alert sent 5 days ago, don't send again until 60-day window
        if (daysSinceLastAlert < interval - lowerBound) {
          return null;
        }
      }
      return interval;
    }
  }

  return null;
}

/**
 * Generate renewal URL for battery warranties
 */
function getRenewalUrl(warrantyId: string): string {
  return `${APP_BASE_URL}/support/warranties/${warrantyId}?action=extend`;
}

/**
 * Get display label for warranty policy type
 */
function getPolicyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    battery_performance: 'Battery Performance Warranty',
    inverter_manufacturer: 'Inverter Manufacturer Warranty',
    installation_workmanship: 'Installation Workmanship Warranty',
  };
  return labels[type] || type;
}

// ============================================================================
// CHECK EXPIRING WARRANTIES JOB (Scheduled)
// ============================================================================

/**
 * Scheduled job that runs daily to check for expiring warranties.
 *
 * Acceptance criteria from DOM-WAR-003a:
 * 1. checkExpiringWarranties creates internal notification records for battery and inverter warranties
 * 2. Email sent to customer at 30/60/90 day intervals (configurable) with battery cycle status
 * 3. Internal alert created for assigned sales rep or account manager
 * 4. Renewal/extension option link included in notification for battery performance warranties
 * 5. Battery warranties show cycle count alongside time-based expiry
 */
export const checkExpiringWarrantiesJob = client.defineJob({
  id: 'check-expiring-warranties',
  name: 'Check Expiring Warranties',
  version: '1.0.0',
  trigger: cronTrigger({
    cron: '0 8 * * *', // Run daily at 8 AM
  }),
  run: async (_payload, io) => {
    await io.logger.info('Starting daily warranty expiry check');

    // Get the maximum interval (90 days)
    const maxInterval = Math.max(...DEFAULT_ALERT_INTERVALS);

    // Calculate date window
    const today = new Date();
    const maxExpiryDate = new Date(today);
    maxExpiryDate.setDate(maxExpiryDate.getDate() + maxInterval);

    // Query warranties expiring within the max interval
    const expiringWarranties = await io.runTask('query-expiring-warranties', async () => {
      const results = await db
        .select({
          id: warranties.id,
          warrantyNumber: warranties.warrantyNumber,
          organizationId: warranties.organizationId,
          customerId: warranties.customerId,
          customerName: customers.name,
          customerEmail: customers.email,
          productId: warranties.productId,
          // Product name comes from a separate join
          productSerial: warranties.productSerial,
          policyType: warrantyPolicies.type,
          policyName: warrantyPolicies.name,
          expiryDate: warranties.expiryDate,
          currentCycleCount: warranties.currentCycleCount,
          cycleLimit: warrantyPolicies.cycleLimit,
          assignedUserId: warranties.assignedUserId,
          expiryAlertOptOut: warranties.expiryAlertOptOut,
          lastExpiryAlertSent: warranties.lastExpiryAlertSent,
          // Customer-level opt-out (DOM-WAR-003d)
          customerOptOut: customers.warrantyExpiryAlertOptOut,
        })
        .from(warranties)
        .innerJoin(customers, eq(customers.id, warranties.customerId))
        .innerJoin(warrantyPolicies, eq(warrantyPolicies.id, warranties.warrantyPolicyId))
        .where(
          and(
            // Active warranties only
            eq(warranties.status, 'active'),
            // Not opted out at warranty level
            eq(warranties.expiryAlertOptOut, false),
            // Not opted out at customer level (DOM-WAR-003d)
            eq(customers.warrantyExpiryAlertOptOut, false),
            // Expiring within window
            gte(warranties.expiryDate, today),
            lte(warranties.expiryDate, maxExpiryDate)
          )
        );

      return results;
    });

    await io.logger.info(`Found ${expiringWarranties.length} warranties in expiry window`);

    // Get product names via separate query (products table)
    const productIds = [...new Set(expiringWarranties.map((w) => w.productId))];
    const productNamesResult = await io.runTask('get-product-names', async () => {
      if (productIds.length === 0) return {} as Record<string, string>;

      const { products } = await import('drizzle/schema');
      const productRecords = await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(inArray(products.id, productIds))
        .execute();

      // Return as plain object for JSON serialization
      return Object.fromEntries(productRecords.map((p) => [p.id, p.name])) as Record<
        string,
        string
      >;
    });
    const productNames = productNamesResult || {};

    // Note: If future requirements need to email assigned users directly,
    // add a similar lookup pattern here using users table

    // Process each warranty
    let customersNotified = 0;
    let internalAlertsCreated = 0;
    let skipped = 0;

    for (const warranty of expiringWarranties) {
      const taskId = `process-warranty-${warranty.id}`;

      await io.runTask(taskId, async () => {
        const productName = productNames[warranty.productId] || 'Unknown Product';

        // Calculate days until expiry
        const daysUntilExpiry = Math.ceil(
          (warranty.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if this warranty should receive an alert at this interval
        const alertInterval = getAlertInterval(daysUntilExpiry, warranty.lastExpiryAlertSent);

        if (alertInterval === null) {
          await io.logger.debug(
            `Skipping warranty ${warranty.warrantyNumber} - not in alert window`,
            {
              daysUntilExpiry,
              lastAlertSent: warranty.lastExpiryAlertSent?.toISOString(),
            }
          );
          skipped++;
          return;
        }

        await io.logger.info(`Processing expiry alert for warranty ${warranty.warrantyNumber}`, {
          daysUntilExpiry,
          alertInterval,
          policyType: warranty.policyType,
        });

        // Build payload for expiry event
        const payload: WarrantyExpiringSoonPayload = {
          warrantyId: warranty.id,
          warrantyNumber: warranty.warrantyNumber,
          organizationId: warranty.organizationId,
          customerId: warranty.customerId,
          customerEmail: warranty.customerEmail ?? undefined,
          productName,
          policyType: warranty.policyType,
          expiryDate: warranty.expiryDate.toISOString(),
          daysUntilExpiry,
          currentCycleCount: warranty.currentCycleCount ?? undefined,
          cycleLimit: warranty.cycleLimit ?? undefined,
          // Only include renewal URL for battery warranties
          renewalUrl:
            warranty.policyType === 'battery_performance' ? getRenewalUrl(warranty.id) : undefined,
        };

        // Step 1: Send customer notification if email exists
        if (warranty.customerEmail) {
          await client.sendEvent({
            name: warrantyEvents.expiringSoon,
            payload,
          });
          customersNotified++;
          await io.logger.info(`Triggered expiry notification for customer`, {
            warrantyNumber: warranty.warrantyNumber,
            customerEmail: warranty.customerEmail,
          });
        }

        // Step 2: Create internal alert for assigned sales rep/account manager
        if (warranty.assignedUserId) {
          const isBattery = warranty.policyType === 'battery_performance';
          const cycleInfo =
            isBattery && warranty.cycleLimit
              ? warranty.currentCycleCount
                ? ` (${warranty.currentCycleCount.toLocaleString()}/${warranty.cycleLimit.toLocaleString()} cycles used)`
                : ` (${warranty.cycleLimit.toLocaleString()} cycle limit)`
              : '';

          await db.insert(notifications).values({
            organizationId: warranty.organizationId,
            userId: warranty.assignedUserId,
            type: 'warranty',
            title: `Warranty Expiring: ${productName}`,
            message: `${warranty.customerName || 'Customer'}'s ${getPolicyTypeLabel(warranty.policyType)} for ${productName} expires in ${daysUntilExpiry} days${cycleInfo}. Consider reaching out about renewal options.`,
            data: {
              entityId: warranty.id,
              entityType: 'warranty',
              subType: 'internal_expiry_alert',
              warrantyNumber: warranty.warrantyNumber,
              customerId: warranty.customerId,
              customerName: warranty.customerName,
              productName,
              policyType: warranty.policyType,
              expiryDate: warranty.expiryDate.toISOString(),
              daysUntilExpiry,
              currentCycleCount: warranty.currentCycleCount,
              cycleLimit: warranty.cycleLimit,
              alertInterval,
            },
            status: 'pending',
          });
          internalAlertsCreated++;
          await io.logger.info(`Created internal alert for assigned user`, {
            warrantyNumber: warranty.warrantyNumber,
            assignedUserId: warranty.assignedUserId,
          });
        }

        // Step 3: Update last alert sent timestamp
        await db
          .update(warranties)
          .set({ lastExpiryAlertSent: new Date() })
          .where(eq(warranties.id, warranty.id));
      });
    }

    await io.logger.info('Warranty expiry check completed', {
      total: expiringWarranties.length,
      customersNotified,
      internalAlertsCreated,
      skipped,
    });

    return {
      success: true,
      processed: expiringWarranties.length,
      customersNotified,
      internalAlertsCreated,
      skipped,
    };
  },
});

// ============================================================================
// MANUAL TRIGGER JOB (for testing/admin use)
// ============================================================================

/**
 * Event-triggered version for manual invocation or testing.
 * Allows specifying custom alert intervals and date ranges.
 */
export const checkExpiringWarrantiesManualJob = client.defineJob({
  id: 'check-expiring-warranties-manual',
  name: 'Check Expiring Warranties (Manual)',
  version: '1.0.0',
  trigger: eventTrigger({
    name: 'warranty.check_expiring_manual',
  }),
  run: async (
    payload: {
      organizationId?: string;
      alertIntervals?: number[];
      maxDaysAhead?: number;
    },
    io
  ) => {
    const { organizationId, alertIntervals, maxDaysAhead = 90 } = payload;

    await io.logger.info('Manual warranty expiry check triggered', {
      organizationId,
      alertIntervals,
      maxDaysAhead,
    });

    // Calculate date window
    const today = new Date();
    const maxExpiryDate = new Date(today);
    maxExpiryDate.setDate(maxExpiryDate.getDate() + maxDaysAhead);

    // Build query conditions
    const conditions = [
      eq(warranties.status, 'active'),
      eq(warranties.expiryAlertOptOut, false),
      gte(warranties.expiryDate, today),
      lte(warranties.expiryDate, maxExpiryDate),
    ];

    if (organizationId) {
      conditions.push(eq(warranties.organizationId, organizationId));
    }

    // Query warranties
    const expiringWarranties = await db
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        organizationId: warranties.organizationId,
        expiryDate: warranties.expiryDate,
        policyType: warrantyPolicies.type,
      })
      .from(warranties)
      .innerJoin(warrantyPolicies, eq(warrantyPolicies.id, warranties.warrantyPolicyId))
      .where(and(...conditions));

    await io.logger.info(`Found ${expiringWarranties.length} warranties`, {
      organizationId,
      maxDaysAhead,
    });

    return {
      success: true,
      found: expiringWarranties.length,
      warranties: expiringWarranties.map((w) => ({
        id: w.id,
        warrantyNumber: w.warrantyNumber,
        expiryDate: w.expiryDate.toISOString(),
        policyType: w.policyType,
        daysUntilExpiry: Math.ceil(
          (w.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
    };
  },
});
