/**
 * Scheduled Emails Server Functions
 *
 * CRUD operations for scheduled emails with multi-tenant isolation.
 *
 * @see DOM-COMMS-002b
 */
import { createServerFn } from '@tanstack/react-start'
import { eq, and, desc, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  scheduledEmails,
  type ScheduledEmailTemplateData,
  type ScheduledEmailTemplateType,
} from '../../../../drizzle/schema/communications'
import {
  scheduleEmailSchema,
  updateScheduledEmailSchema,
  cancelScheduledEmailSchema,
  getScheduledEmailsSchema,
  getScheduledEmailByIdSchema,
} from '@/lib/schemas/communications'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Schedule a new email
 */
export const scheduleEmail = createServerFn({ method: 'POST' })
  .inputValidator(scheduleEmailSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

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
        status: 'pending',
      })
      .returning()

    return scheduled
  })

/**
 * Get scheduled emails for the organization
 */
export const getScheduledEmails = createServerFn({ method: 'GET' })
  .inputValidator(getScheduledEmailsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const conditions = [eq(scheduledEmails.organizationId, ctx.organizationId)]

    if (data.status) {
      conditions.push(eq(scheduledEmails.status, data.status))
    }

    if (data.customerId) {
      conditions.push(eq(scheduledEmails.customerId, data.customerId))
    }

    const results = await db
      .select()
      .from(scheduledEmails)
      .where(and(...conditions))
      .orderBy(desc(scheduledEmails.scheduledAt))
      .limit(data.limit)
      .offset(data.offset)

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(scheduledEmails)
      .where(and(...conditions))

    return {
      items: results,
      total: Number(countResult?.count ?? 0),
    }
  })

/**
 * Get a scheduled email by ID
 */
export const getScheduledEmailById = createServerFn({ method: 'GET' })
  .inputValidator(getScheduledEmailByIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const [email] = await db
      .select()
      .from(scheduledEmails)
      .where(
        and(
          eq(scheduledEmails.id, data.id),
          eq(scheduledEmails.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    return email ?? null
  })

/**
 * Update a scheduled email
 */
export const updateScheduledEmail = createServerFn({ method: 'POST' })
  .inputValidator(updateScheduledEmailSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    const [updated] = await db
      .update(scheduledEmails)
      .set({
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName,
        subject: data.subject,
        templateData: data.templateData as ScheduledEmailTemplateData,
        scheduledAt: data.scheduledAt,
        timezone: data.timezone,
      })
      .where(
        and(
          eq(scheduledEmails.id, data.id),
          eq(scheduledEmails.organizationId, ctx.organizationId),
          eq(scheduledEmails.status, 'pending'),
        ),
      )
      .returning()

    if (!updated) {
      throw new Error('Scheduled email not found or cannot be updated')
    }

    return updated
  })

/**
 * Cancel a scheduled email
 */
export const cancelScheduledEmail = createServerFn({ method: 'POST' })
  .inputValidator(cancelScheduledEmailSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    const [updated] = await db
      .update(scheduledEmails)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: data.reason,
      })
      .where(
        and(
          eq(scheduledEmails.id, data.id),
          eq(scheduledEmails.organizationId, ctx.organizationId),
          eq(scheduledEmails.status, 'pending'),
        ),
      )
      .returning()

    if (!updated) {
      throw new Error('Scheduled email not found or cannot be cancelled')
    }

    return updated
  })

// ============================================================================
// INTERNAL FUNCTIONS (for Trigger.dev jobs)
// ============================================================================

/**
 * Get emails ready to send
 */
export async function getEmailsToSend(): Promise<
  Array<typeof scheduledEmails.$inferSelect>
> {
  const now = new Date()

  return db
    .select()
    .from(scheduledEmails)
    .where(
      and(
        eq(scheduledEmails.status, 'pending'),
        lte(scheduledEmails.scheduledAt, now),
      ),
    )
}

export async function getDueScheduledEmails(
  limit: number = 50,
): Promise<Array<typeof scheduledEmails.$inferSelect>> {
  const now = new Date()

  return db
    .select()
    .from(scheduledEmails)
    .where(
      and(
        eq(scheduledEmails.status, 'pending'),
        lte(scheduledEmails.scheduledAt, now),
      ),
    )
    .orderBy(desc(scheduledEmails.scheduledAt))
    .limit(limit)
}

export async function markScheduledEmailAsSent(
  scheduledEmailId: string,
  emailHistoryId: string,
): Promise<void> {
  await db
    .update(scheduledEmails)
    .set({
      status: 'sent',
      sentAt: new Date(),
      emailHistoryId,
      updatedAt: new Date(),
    })
    .where(eq(scheduledEmails.id, scheduledEmailId))
}
