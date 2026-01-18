/**
 * Scheduled Calls Server Functions
 *
 * CRUD operations for scheduled calls with reminder support.
 * Logs completed calls to customer activities.
 *
 * @see DOM-COMMS-004b
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  scheduledCalls,
  customerActivities,
  type ScheduledCallPurpose,
} from "../../../drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const scheduleCallSchema = z.object({
  customerId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  scheduledAt: z.coerce.date(),
  reminderAt: z.coerce.date().optional(),
  purpose: z.enum([
    "quote_follow_up",
    "installation",
    "technical_support",
    "sales",
    "general",
    "other",
  ]).default("general"),
  notes: z.string().optional(),
});

const updateScheduledCallSchema = z.object({
  id: z.string().uuid(),
  scheduledAt: z.coerce.date().optional(),
  reminderAt: z.coerce.date().optional(),
  purpose: z.enum([
    "quote_follow_up",
    "installation",
    "technical_support",
    "sales",
    "general",
    "other",
  ]).optional(),
  notes: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
});

const getScheduledCallsSchema = z.object({
  assigneeId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: z.enum(["pending", "completed", "cancelled", "rescheduled"]).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const cancelScheduledCallSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
});

const rescheduleCallSchema = z.object({
  id: z.string().uuid(),
  newScheduledAt: z.coerce.date(),
  reminderAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

const completeCallSchema = z.object({
  id: z.string().uuid(),
  outcome: z.enum([
    "answered",
    "no_answer",
    "voicemail",
    "busy",
    "wrong_number",
    "callback_requested",
    "completed_successfully",
  ]),
  outcomeNotes: z.string().optional(),
});

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Schedule a new call
 */
export const scheduleCall = createServerFn({ method: "POST" })
  .inputValidator(scheduleCallSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const [call] = await db
      .insert(scheduledCalls)
      .values({
        organizationId: ctx.organizationId,
        customerId: data.customerId,
        assigneeId: data.assigneeId ?? ctx.user.id,
        scheduledAt: data.scheduledAt,
        reminderAt: data.reminderAt,
        purpose: data.purpose as ScheduledCallPurpose,
        notes: data.notes,
        status: "pending",
      })
      .returning();

    return call;
  });

/**
 * Get scheduled calls with optional filters
 */
export const getScheduledCalls = createServerFn({ method: "GET" })
  .inputValidator(getScheduledCallsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const conditions = [eq(scheduledCalls.organizationId, ctx.organizationId)];

    if (data.assigneeId) {
      conditions.push(eq(scheduledCalls.assigneeId, data.assigneeId));
    }

    if (data.customerId) {
      conditions.push(eq(scheduledCalls.customerId, data.customerId));
    }

    if (data.status) {
      conditions.push(eq(scheduledCalls.status, data.status));
    }

    if (data.fromDate) {
      conditions.push(gte(scheduledCalls.scheduledAt, data.fromDate));
    }

    if (data.toDate) {
      conditions.push(lte(scheduledCalls.scheduledAt, data.toDate));
    }

    const results = await db
      .select()
      .from(scheduledCalls)
      .where(and(...conditions))
      .orderBy(desc(scheduledCalls.scheduledAt))
      .limit(data.limit)
      .offset(data.offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(scheduledCalls)
      .where(and(...conditions));

    return {
      items: results,
      total: Number(countResult?.count ?? 0),
    };
  });

/**
 * Get a single scheduled call by ID
 */
export const getScheduledCallById = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const [call] = await db
      .select()
      .from(scheduledCalls)
      .where(
        and(
          eq(scheduledCalls.id, data.id),
          eq(scheduledCalls.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    return call ?? null;
  });

/**
 * Update a scheduled call
 */
export const updateScheduledCall = createServerFn({ method: "POST" })
  .inputValidator(updateScheduledCallSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    // Verify call exists and is pending
    const [existing] = await db
      .select()
      .from(scheduledCalls)
      .where(
        and(
          eq(scheduledCalls.id, data.id),
          eq(scheduledCalls.organizationId, ctx.organizationId),
          eq(scheduledCalls.status, "pending")
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error("Scheduled call not found or cannot be updated");
    }

    const updateData: Partial<typeof scheduledCalls.$inferInsert> = {};

    if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt;
    if (data.reminderAt !== undefined) updateData.reminderAt = data.reminderAt;
    if (data.purpose !== undefined) updateData.purpose = data.purpose as ScheduledCallPurpose;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;

    const [updated] = await db
      .update(scheduledCalls)
      .set(updateData)
      .where(eq(scheduledCalls.id, data.id))
      .returning();

    return updated;
  });

/**
 * Cancel a scheduled call
 */
export const cancelScheduledCall = createServerFn({ method: "POST" })
  .inputValidator(cancelScheduledCallSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const [updated] = await db
      .update(scheduledCalls)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: data.reason,
      })
      .where(
        and(
          eq(scheduledCalls.id, data.id),
          eq(scheduledCalls.organizationId, ctx.organizationId),
          eq(scheduledCalls.status, "pending")
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Scheduled call not found or cannot be cancelled");
    }

    return updated;
  });

/**
 * Reschedule a call - creates a new call and marks original as rescheduled
 */
export const rescheduleCall = createServerFn({ method: "POST" })
  .inputValidator(rescheduleCallSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    // Get the original call
    const [original] = await db
      .select()
      .from(scheduledCalls)
      .where(
        and(
          eq(scheduledCalls.id, data.id),
          eq(scheduledCalls.organizationId, ctx.organizationId),
          eq(scheduledCalls.status, "pending")
        )
      )
      .limit(1);

    if (!original) {
      throw new Error("Scheduled call not found or cannot be rescheduled");
    }

    // Create new call
    const [newCall] = await db
      .insert(scheduledCalls)
      .values({
        organizationId: ctx.organizationId,
        customerId: original.customerId,
        assigneeId: original.assigneeId,
        scheduledAt: data.newScheduledAt,
        reminderAt: data.reminderAt,
        purpose: original.purpose,
        notes: data.notes ?? original.notes,
        status: "pending",
      })
      .returning();

    // Mark original as rescheduled
    await db
      .update(scheduledCalls)
      .set({
        status: "rescheduled",
        rescheduledToId: newCall.id,
      })
      .where(eq(scheduledCalls.id, data.id));

    return newCall;
  });

/**
 * Complete a call and log to customer activities
 */
export const completeCall = createServerFn({ method: "POST" })
  .inputValidator(completeCallSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    // Get the call
    const [call] = await db
      .select()
      .from(scheduledCalls)
      .where(
        and(
          eq(scheduledCalls.id, data.id),
          eq(scheduledCalls.organizationId, ctx.organizationId),
          eq(scheduledCalls.status, "pending")
        )
      )
      .limit(1);

    if (!call) {
      throw new Error("Scheduled call not found or already completed");
    }

    // Update call status
    const [updated] = await db
      .update(scheduledCalls)
      .set({
        status: "completed",
        completedAt: new Date(),
        outcome: data.outcome,
        outcomeNotes: data.outcomeNotes,
      })
      .where(eq(scheduledCalls.id, data.id))
      .returning();

    // Log to customer activities
    await db.insert(customerActivities).values({
      organizationId: ctx.organizationId,
      customerId: call.customerId,
      createdBy: ctx.user.id,
      activityType: "call",
      description: `Call completed: ${data.outcome.replace("_", " ")}`,
      outcome: data.outcome,
      completedAt: new Date().toISOString(),
      metadata: {
        callId: call.id,
        purpose: call.purpose,
        outcomeNotes: data.outcomeNotes,
        scheduledAt: call.scheduledAt.toISOString(),
      },
    });

    return updated;
  });

// ============================================================================
// INTERNAL FUNCTIONS (for Trigger.dev jobs)
// ============================================================================

/**
 * Get calls due for reminder notification
 */
export async function getCallsDueForReminder(
  withinMinutes: number = 15
): Promise<Array<typeof scheduledCalls.$inferSelect>> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + withinMinutes * 60 * 1000);

  const calls = await db
    .select()
    .from(scheduledCalls)
    .where(
      and(
        eq(scheduledCalls.status, "pending"),
        sql`${scheduledCalls.reminderAt} IS NOT NULL`,
        gte(scheduledCalls.reminderAt, now),
        lte(scheduledCalls.reminderAt, cutoff)
      )
    );

  return calls;
}

/**
 * Get overdue calls (scheduled time has passed but not completed)
 */
export async function getOverdueCalls(): Promise<Array<typeof scheduledCalls.$inferSelect>> {
  const now = new Date();

  const calls = await db
    .select()
    .from(scheduledCalls)
    .where(
      and(
        eq(scheduledCalls.status, "pending"),
        lte(scheduledCalls.scheduledAt, now)
      )
    );

  return calls;
}

/**
 * Get upcoming calls for a user within a time window
 */
export async function getUpcomingCallsForUser(
  userId: string,
  organizationId: string,
  hoursAhead: number = 24
): Promise<Array<typeof scheduledCalls.$inferSelect>> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const calls = await db
    .select()
    .from(scheduledCalls)
    .where(
      and(
        eq(scheduledCalls.assigneeId, userId),
        eq(scheduledCalls.organizationId, organizationId),
        eq(scheduledCalls.status, "pending"),
        gte(scheduledCalls.scheduledAt, now),
        lte(scheduledCalls.scheduledAt, cutoff)
      )
    )
    .orderBy(scheduledCalls.scheduledAt);

  return calls;
}
