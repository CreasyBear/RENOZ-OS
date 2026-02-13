'use server'

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

import { schedules, logger } from "@trigger.dev/sdk/v3";
import { eq, and, sql, isNull, ne, gt, or, asc, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  reminderTemplates,
  reminderHistory,
  orders,
  customers,
} from "drizzle/schema";
import { organizations } from "drizzle/schema/settings/organizations";
import {
  calculateDaysOverdue,
  getEffectiveDueDate,
  formatAUD,
  formatDateForDisplay,
  renderTemplate,
} from "@/lib/utils/financial";

// ============================================================================
// CONSTANTS
// ============================================================================

const PAYMENT_TERMS_DAYS = 30;
const MAX_ORDERS_PER_ORG = 100; // Process up to 100 orders per organization per run

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessPaymentRemindersResult {
  organizationsChecked: number;
  ordersProcessed: number;
  remindersSent: number;
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
  id: "process-payment-reminders",
  cron: "0 8 * * *", // Daily at 8am
  run: async (): Promise<ProcessPaymentRemindersResult> => {
    logger.info("Starting payment reminder processing");

    // Get all active organizations
    const orgs = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(isNull(organizations.deletedAt));

    logger.info(`Found ${orgs.length} organizations to check`);

    let totalOrdersProcessed = 0;
    let totalRemindersSent = 0;
    let totalRemindersSkipped = 0;
    let totalErrors = 0;

    // Process each organization
    for (const org of orgs) {
      try {
        logger.info(`Processing reminders for organization ${org.id}`);

        // Get active reminder templates for this organization
        const activeTemplates = await db
          .select({
            id: reminderTemplates.id,
            name: reminderTemplates.name,
            daysOverdue: reminderTemplates.daysOverdue,
            subject: reminderTemplates.subject,
            body: reminderTemplates.body,
          })
          .from(reminderTemplates)
          .where(
            and(
              eq(reminderTemplates.organizationId, org.id),
              eq(reminderTemplates.isActive, true)
            )
          )
          .orderBy(asc(reminderTemplates.daysOverdue));

        if (activeTemplates.length === 0) {
          logger.info(`No active templates for organization ${org.id}, skipping`);
          continue;
        }

        // Get orders with outstanding balance
        const outstandingOrders = await db
          .select({
            orderId: orders.id,
            orderNumber: orders.orderNumber,
            orderDate: orders.orderDate,
            dueDate: orders.dueDate,
            total: orders.total,
            paidAmount: orders.paidAmount,
            balanceDue: orders.balanceDue,
            customerId: orders.customerId,
            customerName: customers.name,
            customerEmail: customers.email,
          })
          .from(orders)
          .innerJoin(customers, eq(orders.customerId, customers.id))
          .where(
            and(
              eq(orders.organizationId, org.id),
              isNull(orders.deletedAt),
              ne(orders.status, 'draft'),
              ne(orders.status, 'cancelled'),
              // Has outstanding balance
              or(
                gt(orders.balanceDue, sql`0`),
                and(
                  isNull(orders.balanceDue),
                  sql`COALESCE(${orders.total}, 0) > COALESCE(${orders.paidAmount}, 0)`
                )
              )
            )
          )
          .limit(MAX_ORDERS_PER_ORG);

        if (outstandingOrders.length === 0) {
          logger.info(`No outstanding orders for organization ${org.id}`);
          continue;
        }

        // Get reminder history for these orders
        const orderIds = outstandingOrders.map((o) => o.orderId);
        const reminderHistoryMap = new Map<string, { sentAt: Date; daysOverdue: number | null }>();

        if (orderIds.length > 0) {
          const historyResult = await db
            .select({
              orderId: reminderHistory.orderId,
              sentAt: reminderHistory.sentAt,
              daysOverdue: reminderHistory.daysOverdue,
            })
            .from(reminderHistory)
            .where(
              and(
                eq(reminderHistory.organizationId, org.id),
                inArray(reminderHistory.orderId, orderIds)
              )
            )
            .orderBy(desc(reminderHistory.sentAt));

          // Keep only the most recent reminder per order
          for (const h of historyResult) {
            if (!reminderHistoryMap.has(h.orderId)) {
              reminderHistoryMap.set(h.orderId, { sentAt: h.sentAt, daysOverdue: h.daysOverdue });
            }
          }
        }

        // Process each order
        for (const order of outstandingOrders) {
          try {
            const effectiveDueDate = getEffectiveDueDate(order.orderDate, order.dueDate, PAYMENT_TERMS_DAYS);
            const daysOverdue = calculateDaysOverdue(effectiveDueDate, new Date());

            // Skip if not overdue
            if (daysOverdue < 1) continue;

            const balanceDue = order.balanceDue ?? (order.total ?? 0) - (order.paidAmount ?? 0);
            if (balanceDue <= 0) continue;

            // Find matching template (closest match <= days overdue)
            let matchingTemplate = null;
            for (const t of activeTemplates) {
              if (daysOverdue >= t.daysOverdue) {
                matchingTemplate = t;
              }
            }

            if (!matchingTemplate) {
              logger.info(`No matching template for order ${order.orderNumber} (${daysOverdue} days overdue)`);
              totalRemindersSkipped++;
              continue;
            }

            // Check if already reminded at this tier or higher
            const lastReminder = reminderHistoryMap.get(order.orderId);
            if (lastReminder && lastReminder.daysOverdue !== null) {
              if (lastReminder.daysOverdue >= matchingTemplate.daysOverdue) {
                logger.info(`Order ${order.orderNumber} already reminded at tier ${lastReminder.daysOverdue}, skipping`);
                totalRemindersSkipped++;
                continue;
              }
            }

            // Skip if no email address
            if (!order.customerEmail) {
              logger.info(`No email address for customer ${order.customerId}, skipping`);
              totalRemindersSkipped++;
              continue;
            }

            // Prepare template variables (using Record<string, string> for renderTemplate compatibility)
            const variables: Record<string, string> = {
              customerName: order.customerName ?? 'Customer',
              invoiceNumber: order.orderNumber,
              invoiceAmount: formatAUD(balanceDue),
              invoiceDate: formatDateForDisplay(new Date(order.orderDate)),
              dueDate: formatDateForDisplay(effectiveDueDate),
              daysOverdue: String(Math.max(0, daysOverdue)),
              orderDescription: `Order ${order.orderNumber}`,
              paymentTerms: `Net ${PAYMENT_TERMS_DAYS} days`,
            };

            // Render subject and body
            const renderedSubject = renderTemplate(matchingTemplate.subject, variables);
            const renderedBody = renderTemplate(matchingTemplate.body, variables);

            // Record in history (email sending would be handled by email service)
            await db.insert(reminderHistory).values({
              organizationId: org.id,
              orderId: order.orderId,
              templateId: matchingTemplate.id,
              templateName: matchingTemplate.name,
              daysOverdue: matchingTemplate.daysOverdue,
              subjectSent: renderedSubject,
              bodySent: renderedBody,
              recipientEmail: order.customerEmail,
              sentAt: new Date(),
              deliveryStatus: 'pending', // Will be updated by email service
              isManualSend: false,
              createdBy: null, // System job
            });

            logger.info(`Recorded reminder for order ${order.orderNumber} (${daysOverdue} days overdue)`);
            totalRemindersSent++;
            totalOrdersProcessed++;
          } catch (error) {
            logger.error(`Error processing order ${order.orderId}:`, { error: error instanceof Error ? error : String(error) });
            totalErrors++;
          }
        }
      } catch (error) {
        logger.error(`Error processing organization ${org.id}:`, { error: error instanceof Error ? error : String(error) });
        totalErrors++;
      }
    }

    const result: ProcessPaymentRemindersResult = {
      organizationsChecked: orgs.length,
      ordersProcessed: totalOrdersProcessed,
      remindersSent: totalRemindersSent,
      remindersSkipped: totalRemindersSkipped,
      errors: totalErrors,
    };

    logger.info("Payment reminder processing complete", { ...result });
    return result;
  },
});
