/**
 * Process Scheduled Calls Job
 *
 * Trigger.dev task for sending reminder notifications before scheduled calls.
 * Runs periodically to check for calls due for reminders.
 *
 * @see DOM-COMMS-004b
 */

import { cronTrigger } from "@trigger.dev/sdk";
import { client } from "../client";
import { db } from "@/lib/db";
import { scheduledCalls, customers, notifications } from "@/../drizzle/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

// ============================================================================
// JOB DEFINITION
// ============================================================================

/**
 * Process Scheduled Calls Job
 *
 * Runs every 5 minutes to check for calls that need reminders.
 * Creates in-app notifications for assignees.
 */
export const processScheduledCallsJob = client.defineJob({
  id: "process-scheduled-calls",
  name: "Process Scheduled Call Reminders",
  version: "1.0.0",
  trigger: cronTrigger({
    // Run every 5 minutes
    cron: "*/5 * * * *",
  }),
  run: async (_payload, io) => {
    await io.logger.info("Checking for scheduled call reminders");

    const now = new Date();
    // Look for calls with reminders due in the next 5 minutes
    const windowStart = now;
    const windowEnd = new Date(now.getTime() + 5 * 60 * 1000);

    // Get calls due for reminder
    const callsDue = await db
      .select({
        id: scheduledCalls.id,
        customerId: scheduledCalls.customerId,
        assigneeId: scheduledCalls.assigneeId,
        scheduledAt: scheduledCalls.scheduledAt,
        reminderAt: scheduledCalls.reminderAt,
        purpose: scheduledCalls.purpose,
        notes: scheduledCalls.notes,
        organizationId: scheduledCalls.organizationId,
      })
      .from(scheduledCalls)
      .where(
        and(
          eq(scheduledCalls.status, "pending"),
          sql`${scheduledCalls.reminderAt} IS NOT NULL`,
          gte(scheduledCalls.reminderAt, windowStart),
          lte(scheduledCalls.reminderAt, windowEnd)
        )
      )
      .limit(100);

    await io.logger.info(`Found ${callsDue.length} calls due for reminders`);

    if (callsDue.length === 0) {
      return { processed: 0 };
    }

    let processedCount = 0;

    for (const call of callsDue) {
      const taskId = `reminder-${call.id}`;

      try {
        await io.runTask(taskId, async () => {
          // Get customer name for the notification
          const [customer] = await db
            .select({
              name: customers.name,
            })
            .from(customers)
            .where(eq(customers.id, call.customerId))
            .limit(1);

          const customerName = customer?.name || "Unknown Customer";
          const scheduledTime = call.scheduledAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const purposeLabel = call.purpose
            .replace("_", " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());

          // Create in-app notification for the assignee
          await db.insert(notifications).values({
            organizationId: call.organizationId,
            userId: call.assigneeId,
            type: "call_reminder",
            title: "Upcoming Call Reminder",
            message: `You have a ${purposeLabel} call with ${customerName} scheduled for ${scheduledTime}`,
            data: {
              callId: call.id,
              customerId: call.customerId,
              customerName,
              scheduledAt: call.scheduledAt.toISOString(),
              purpose: call.purpose,
            },
          });

          await io.logger.info(`Created reminder for call ${call.id}`);
          processedCount++;
        });
      } catch (error) {
        await io.logger.error(`Failed to process reminder for call ${call.id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await io.logger.info(`Processed ${processedCount} call reminders`);

    return {
      processed: processedCount,
      total: callsDue.length,
    };
  },
});

/**
 * Process Overdue Calls Job
 *
 * Runs every 15 minutes to check for overdue calls.
 * Creates notifications for calls that weren't completed.
 */
export const processOverdueCallsJob = client.defineJob({
  id: "process-overdue-calls",
  name: "Process Overdue Calls",
  version: "1.0.0",
  trigger: cronTrigger({
    // Run every 15 minutes
    cron: "*/15 * * * *",
  }),
  run: async (_payload, io) => {
    await io.logger.info("Checking for overdue calls");

    const now = new Date();
    // Look for calls that are more than 30 minutes overdue
    const overdueThreshold = new Date(now.getTime() - 30 * 60 * 1000);

    const overdueCalls = await db
      .select({
        id: scheduledCalls.id,
        customerId: scheduledCalls.customerId,
        assigneeId: scheduledCalls.assigneeId,
        scheduledAt: scheduledCalls.scheduledAt,
        purpose: scheduledCalls.purpose,
        organizationId: scheduledCalls.organizationId,
      })
      .from(scheduledCalls)
      .where(
        and(
          eq(scheduledCalls.status, "pending"),
          lte(scheduledCalls.scheduledAt, overdueThreshold)
        )
      )
      .limit(100);

    await io.logger.info(`Found ${overdueCalls.length} overdue calls`);

    if (overdueCalls.length === 0) {
      return { processed: 0 };
    }

    let processedCount = 0;

    for (const call of overdueCalls) {
      const taskId = `overdue-${call.id}`;

      try {
        await io.runTask(taskId, async () => {
          // Get customer name for the notification
          const [customer] = await db
            .select({
              name: customers.name,
            })
            .from(customers)
            .where(eq(customers.id, call.customerId))
            .limit(1);

          const customerName = customer?.name || "Unknown Customer";

          // Check if we already sent an overdue notification
          const [existingNotification] = await db
            .select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.userId, call.assigneeId),
                eq(notifications.type, "call_overdue"),
                sql`${notifications.data}->>'callId' = ${call.id}`
              )
            )
            .limit(1);

          if (existingNotification) {
            await io.logger.info(`Overdue notification already sent for call ${call.id}`);
            return;
          }

          // Create overdue notification
          await db.insert(notifications).values({
            organizationId: call.organizationId,
            userId: call.assigneeId,
            type: "call_overdue",
            title: "Overdue Call",
            message: `Your scheduled call with ${customerName} is overdue. Please complete or reschedule.`,
            data: {
              callId: call.id,
              customerId: call.customerId,
              customerName,
              scheduledAt: call.scheduledAt.toISOString(),
              purpose: call.purpose,
            },
          });

          await io.logger.info(`Created overdue notification for call ${call.id}`);
          processedCount++;
        });
      } catch (error) {
        await io.logger.error(`Failed to process overdue call ${call.id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await io.logger.info(`Processed ${processedCount} overdue calls`);

    return {
      processed: processedCount,
      total: overdueCalls.length,
    };
  },
});
