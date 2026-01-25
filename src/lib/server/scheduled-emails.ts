/**
 * Scheduled Emails Server Functions
 *
 * CRUD operations for scheduled emails with multi-tenant isolation.
 *
 * @see DOM-COMMS-002b
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, desc, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { scheduledEmails, type ScheduledEmailTemplateData, type ScheduledEmailTemplateType } from "../../../drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const scheduleEmailSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  customerId: z.string().uuid().optional(),
  subject: z.string().min(1),
  templateType: z.enum([
    "welcome",
    "follow_up",
    "quote",
    "order_confirmation",
    "shipping_notification",
    "reminder",
    "custom",
  ]),
  templateData: z.record(z.string(), z.unknown()).optional(),
  scheduledAt: z.coerce.date(),
  timezone: z.string().optional().default("UTC"),
});

const updateScheduledEmailSchema = z.object({
  id: z.string().uuid(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  subject: z.string().min(1).optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
  scheduledAt: z.coerce.date().optional(),
  timezone: z.string().optional(),
});

const cancelScheduledEmailSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
});

const getScheduledEmailsSchema = z.object({
  status: z.enum(["pending", "sent", "cancelled"]).optional(),
  customerId: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const getScheduledEmailByIdSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Schedule a new email
 */
export const scheduleEmail = createServerFn({ method: "POST" })
  .inputValidator(scheduleEmailSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const [scheduled] = await db
      .insert(scheduledEmails)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName,
        customerId: data.customerId,
        subject: data.subject,
        templateType: data.templateType as ScheduledEmailTemplateType,
        templateData: (data.templateData || {}) as ScheduledEmailTemplateData,
        scheduledAt: data.scheduledAt,
        timezone: data.timezone,
        status: "pending",
      })
      .returning();

    return scheduled;
  });

/**
 * Get scheduled emails for the organization
 */
export const getScheduledEmails = createServerFn({ method: "GET" })
  .inputValidator(getScheduledEmailsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const conditions = [eq(scheduledEmails.organizationId, ctx.organizationId)];

    if (data.status) {
      conditions.push(eq(scheduledEmails.status, data.status));
    }

    if (data.customerId) {
      conditions.push(eq(scheduledEmails.customerId, data.customerId));
    }

    const results = await db
      .select()
      .from(scheduledEmails)
      .where(and(...conditions))
      .orderBy(desc(scheduledEmails.scheduledAt))
      .limit(data.limit)
      .offset(data.offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(scheduledEmails)
      .where(and(...conditions));

    return {
      items: results,
      total: Number(countResult?.count ?? 0),
    };
  });

/**
 * Get a single scheduled email by ID
 */
export const getScheduledEmailById = createServerFn({ method: "GET" })
  .inputValidator(getScheduledEmailByIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const [email] = await db
      .select()
      .from(scheduledEmails)
      .where(
        and(
          eq(scheduledEmails.id, data.id),
          eq(scheduledEmails.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    return email ?? null;
  });

/**
 * Update a scheduled email (only pending emails can be updated)
 */
export const updateScheduledEmail = createServerFn({ method: "POST" })
  .inputValidator(updateScheduledEmailSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const { id, ...updates } = data;

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (updates.recipientEmail) updateData.recipientEmail = updates.recipientEmail;
    if (updates.recipientName) updateData.recipientName = updates.recipientName;
    if (updates.subject) updateData.subject = updates.subject;
    if (updates.templateData) updateData.templateData = updates.templateData as ScheduledEmailTemplateData;
    if (updates.scheduledAt) updateData.scheduledAt = updates.scheduledAt;
    if (updates.timezone) updateData.timezone = updates.timezone;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(scheduledEmails)
      .set(updateData)
      .where(
        and(
          eq(scheduledEmails.id, id),
          eq(scheduledEmails.organizationId, ctx.organizationId),
          eq(scheduledEmails.status, "pending")
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Scheduled email not found or cannot be updated");
    }

    return updated;
  });

/**
 * Cancel a scheduled email
 */
export const cancelScheduledEmail = createServerFn({ method: "POST" })
  .inputValidator(cancelScheduledEmailSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    const [cancelled] = await db
      .update(scheduledEmails)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: data.reason,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scheduledEmails.id, data.id),
          eq(scheduledEmails.organizationId, ctx.organizationId),
          eq(scheduledEmails.status, "pending")
        )
      )
      .returning();

    if (!cancelled) {
      throw new Error("Scheduled email not found or already sent/cancelled");
    }

    return cancelled;
  });

/**
 * Get emails that are due to be sent (used by Trigger.dev job)
 * This is an internal function, not exposed as a server function
 */
export async function getDueScheduledEmails(limit = 100) {
  const now = new Date();

  return db
    .select()
    .from(scheduledEmails)
    .where(
      and(
        eq(scheduledEmails.status, "pending"),
        lte(scheduledEmails.scheduledAt, now)
      )
    )
    .orderBy(scheduledEmails.scheduledAt)
    .limit(limit);
}

/**
 * Mark a scheduled email as sent (used by Trigger.dev job)
 * This is an internal function, not exposed as a server function
 */
export async function markScheduledEmailAsSent(
  id: string,
  emailHistoryId?: string
) {
  const [updated] = await db
    .update(scheduledEmails)
    .set({
      status: "sent",
      sentAt: new Date(),
      emailHistoryId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(scheduledEmails.id, id),
        eq(scheduledEmails.status, "pending")
      )
    )
    .returning();

  return updated;
}
