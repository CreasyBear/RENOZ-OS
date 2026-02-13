/**
 * Scheduled Emails Server Functions
 *
 * CRUD operations for scheduled emails with multi-tenant isolation.
 *
 * @see DOM-COMMS-002b
 */
import { createServerFn } from '@tanstack/react-start'
import { eq, and, desc, asc, lte, or, ilike, count } from 'drizzle-orm'
import { containsPattern } from '@/lib/db/utils'
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
  getScheduledEmailsCursorSchema,
  getScheduledEmailByIdSchema,
} from '@/lib/schemas/communications'
import { decodeCursor, buildCursorCondition, buildCursorResponse } from '@/lib/db/pagination'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { NotFoundError, ConflictError } from '@/lib/server/errors'

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
 * 
 * Supports server-side search across recipientEmail, recipientName, and subject fields.
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

    // M02: Server-side search: ILIKE search across recipientEmail, recipientName, and subject
    // Removed incorrect isNull(recipientName) from OR - it would match all rows with null name
    if (data.search && data.search.trim().length > 0) {
      const searchPattern = containsPattern(data.search.trim())
      conditions.push(
        or(
          ilike(scheduledEmails.recipientEmail, searchPattern),
          ilike(scheduledEmails.recipientName, searchPattern),
          ilike(scheduledEmails.subject, searchPattern)
        )!
      )
    }

    const results = await db
      .select()
      .from(scheduledEmails)
      .where(and(...conditions))
      .orderBy(desc(scheduledEmails.scheduledAt))
      .limit(data.limit)
      .offset(data.offset)

    const [countResult] = await db
      .select({ count: count() })
      .from(scheduledEmails)
      .where(and(...conditions))

    return {
      items: results,
      total: Number(countResult?.count ?? 0),
    }
  })

/**
 * Get scheduled emails with cursor pagination (recommended for large datasets).
 * Uses scheduledAt + id for stable sort.
 */
export const getScheduledEmailsCursor = createServerFn({ method: 'GET' })
  .inputValidator(getScheduledEmailsCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const { cursor, pageSize = 20, sortOrder = 'desc', status, customerId, search } = data

    const conditions = [eq(scheduledEmails.organizationId, ctx.organizationId)]
    if (status) conditions.push(eq(scheduledEmails.status, status))
    if (customerId) conditions.push(eq(scheduledEmails.customerId, customerId))
    if (search && search.trim().length > 0) {
      const searchPattern = containsPattern(search.trim())
      conditions.push(
        or(
          ilike(scheduledEmails.recipientEmail, searchPattern),
          ilike(scheduledEmails.recipientName, searchPattern),
          ilike(scheduledEmails.subject, searchPattern)
        )!
      )
    }

    if (cursor) {
      const cursorPosition = decodeCursor(cursor)
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(scheduledEmails.scheduledAt, scheduledEmails.id, cursorPosition, sortOrder)
        )
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc
    const results = await db
      .select()
      .from(scheduledEmails)
      .where(and(...conditions))
      .orderBy(orderDir(scheduledEmails.scheduledAt), orderDir(scheduledEmails.id))
      .limit(pageSize + 1)

    return buildCursorResponse(
      results,
      pageSize,
      (r) => (r.scheduledAt instanceof Date ? r.scheduledAt.toISOString() : r.scheduledAt),
      (r) => r.id
    )
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

    // Check if scheduled email exists
    const [existing] = await db
      .select()
      .from(scheduledEmails)
      .where(
        and(
          eq(scheduledEmails.id, data.id),
          eq(scheduledEmails.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!existing) {
      throw new NotFoundError('Scheduled email not found', 'scheduled_email')
    }

    if (existing.status !== 'pending') {
      throw new ConflictError(`Cannot update scheduled email with status "${existing.status}". Only pending emails can be updated.`)
    }

    // M03: Add status='pending' to UPDATE WHERE to prevent updating non-pending emails
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
      throw new NotFoundError('Scheduled email not found or no longer pending', 'scheduled_email')
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

    // Check if scheduled email exists
    const [existing] = await db
      .select()
      .from(scheduledEmails)
      .where(
        and(
          eq(scheduledEmails.id, data.id),
          eq(scheduledEmails.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!existing) {
      throw new NotFoundError('Scheduled email not found', 'scheduled_email')
    }

    if (existing.status !== 'pending') {
      throw new ConflictError(`Cannot cancel scheduled email with status "${existing.status}". Only pending emails can be cancelled.`)
    }

    // M04: Add status='pending' to UPDATE WHERE to prevent cancelling non-pending emails
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
      throw new NotFoundError('Scheduled email not found or no longer pending', 'scheduled_email')
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
    .limit(100)
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
