'use server';

/**
 * Process Payment Reminders Job (Trigger.dev v3)
 *
 * Daily job to send payment reminders for overdue invoices.
 * Checks all organizations for orders with outstanding balances and sends reminders
 * based on active reminder templates.
 *
 * @see DOM-FIN-006b
 * @see https://trigger.dev/docs/v3/tasks
 */

import { schedules, logger } from '@trigger.dev/sdk/v3';
import { isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { organizations } from 'drizzle/schema/settings/organizations';
import { processPaymentReminderOrganization } from '@/server/functions/financial/_shared/payment-reminder-queue';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_ORDERS_PER_ORG = 100; // Process up to 100 orders per organization per run

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessPaymentRemindersResult {
  organizationsChecked: number;
  ordersProcessed: number;
  remindersSent: number;
  remindersQueued: number;
  remindersSkipped: number;
  errors: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// All helper functions imported from shared utilities (DRY compliance)

// ============================================================================
// TASK DEFINITION
// ============================================================================

/**
 * Process Payment Reminders Task
 *
 * Runs daily at 8am to check for overdue invoices and send payment reminders.
 */
export const processPaymentRemindersTask = schedules.task({
  id: 'process-payment-reminders',
  cron: '0 8 * * *', // Daily at 8am
  run: async (): Promise<ProcessPaymentRemindersResult> => {
    logger.info('Starting payment reminder processing');

    // Get all active organizations
    const orgs = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(isNull(organizations.deletedAt));

    logger.info(`Found ${orgs.length} organizations to check`);

    let totalOrdersProcessed = 0;
    let totalRemindersSent = 0;
    let totalRemindersQueued = 0;
    let totalRemindersSkipped = 0;
    let totalErrors = 0;

    // Process each organization
    for (const org of orgs) {
      try {
        logger.info(`Processing reminders for organization ${org.id}`);

        const orgResult = await processPaymentReminderOrganization({
          organizationId: org.id,
          logger,
          maxOrders: MAX_ORDERS_PER_ORG,
        });

        totalOrdersProcessed += orgResult.ordersProcessed;
        totalRemindersQueued += orgResult.remindersQueued;
        totalRemindersSkipped += orgResult.remindersSkipped;
        totalErrors += orgResult.errors;
      } catch (error) {
        logger.error(`Error processing organization ${org.id}:`, {
          error: error instanceof Error ? error : String(error),
        });
        totalErrors++;
      }
    }

    const result: ProcessPaymentRemindersResult = {
      organizationsChecked: orgs.length,
      ordersProcessed: totalOrdersProcessed,
      remindersSent: totalRemindersSent,
      remindersQueued: totalRemindersQueued,
      remindersSkipped: totalRemindersSkipped,
      errors: totalErrors,
    };

    logger.info('Payment reminder processing complete', { ...result });
    return result;
  },
});
