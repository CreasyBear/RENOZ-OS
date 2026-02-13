/**
 * Scheduled Calls Server Functions
 *
 * CRUD operations for scheduled calls with reminder support.
 * Logs completed calls to customer activities.
 *
 * @see DOM-COMMS-004b
 */
import { createServerFn } from '@tanstack/react-start'
import { eq, and, desc, asc, gte, lte, count, isNotNull } from 'drizzle-orm'
import { decodeCursor, buildCursorCondition, buildCursorResponse } from '@/lib/db/pagination'
import { db } from '@/lib/db'
import {
  scheduledCalls,
  customerActivities,
  type ScheduledCallPurpose,
} from 'drizzle/schema'
import {
  scheduleCallSchema,
  updateScheduledCallSchema,
  getScheduledCallsSchema,
  getScheduledCallsCursorSchema,
  getScheduledCallByIdSchema,
  cancelScheduledCallSchema,
  rescheduleCallSchema,
  completeCallSchema,
} from '@/lib/schemas/communications'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { NotFoundError, ConflictError } from '@/lib/server/errors'
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context'
import { computeChanges } from '@/lib/activity-logger'

// Excluded fields for activity logging
const SCHEDULED_CALL_EXCLUDED_FIELDS: string[] = [
  'organizationId',
  'createdAt',
  'updatedAt',
]

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Schedule a new call
 */
export const scheduleCall = createServerFn({ method: 'POST' })
  .inputValidator(scheduleCallSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

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
        status: 'pending',
      })
      .returning()

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'call',
      entityId: call.id,
      action: 'created',
      description: `Scheduled call: ${call.purpose}`,
      changes: computeChanges({
        before: null,
        after: call,
        excludeFields: SCHEDULED_CALL_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        customerId: call.customerId,
        callId: call.id,
        purpose: call.purpose,
        scheduledAt: call.scheduledAt.toISOString(),
        assigneeId: call.assigneeId ?? undefined,
      },
    })

    return call
  })

/**
 * Get scheduled calls with optional filters
 */
export const getScheduledCalls = createServerFn({ method: 'GET' })
  .inputValidator(getScheduledCallsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const conditions = [eq(scheduledCalls.organizationId, ctx.organizationId)]

    if (data.assigneeId) {
      conditions.push(eq(scheduledCalls.assigneeId, data.assigneeId))
    }

    if (data.customerId) {
      conditions.push(eq(scheduledCalls.customerId, data.customerId))
    }

    if (data.status) {
      conditions.push(eq(scheduledCalls.status, data.status))
    }

    if (data.fromDate) {
      conditions.push(gte(scheduledCalls.scheduledAt, data.fromDate))
    }

    if (data.toDate) {
      conditions.push(lte(scheduledCalls.scheduledAt, data.toDate))
    }

    const results = await db
      .select()
      .from(scheduledCalls)
      .where(and(...conditions))
      .orderBy(desc(scheduledCalls.scheduledAt))
      .limit(data.limit)
      .offset(data.offset)

    const [countResult] = await db
      .select({ count: count() })
      .from(scheduledCalls)
      .where(and(...conditions))

    return {
      items: results,
      total: Number(countResult?.count ?? 0),
    }
  })

/**
 * Get scheduled calls with cursor pagination (recommended for large datasets).
 * Uses scheduledAt + id for stable sort.
 */
export const getScheduledCallsCursor = createServerFn({ method: 'GET' })
  .inputValidator(getScheduledCallsCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const { cursor, pageSize = 20, sortOrder = 'desc', assigneeId, customerId, status, fromDate, toDate } = data

    const conditions = [eq(scheduledCalls.organizationId, ctx.organizationId)]
    if (assigneeId) conditions.push(eq(scheduledCalls.assigneeId, assigneeId))
    if (customerId) conditions.push(eq(scheduledCalls.customerId, customerId))
    if (status) conditions.push(eq(scheduledCalls.status, status))
    if (fromDate) conditions.push(gte(scheduledCalls.scheduledAt, fromDate))
    if (toDate) conditions.push(lte(scheduledCalls.scheduledAt, toDate))

    if (cursor) {
      const cursorPosition = decodeCursor(cursor)
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(scheduledCalls.scheduledAt, scheduledCalls.id, cursorPosition, sortOrder)
        )
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc
    const results = await db
      .select()
      .from(scheduledCalls)
      .where(and(...conditions))
      .orderBy(orderDir(scheduledCalls.scheduledAt), orderDir(scheduledCalls.id))
      .limit(pageSize + 1)

    return buildCursorResponse(
      results,
      pageSize,
      (r) => r.scheduledAt instanceof Date ? r.scheduledAt.toISOString() : r.scheduledAt,
      (r) => r.id
    )
  })

/**
 * Get a single scheduled call by ID
 */
export const getScheduledCallById = createServerFn({ method: 'GET' })
  .inputValidator(getScheduledCallByIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const [call] = await db
      .select()
      .from(scheduledCalls)
      .where(
        and(
          eq(scheduledCalls.id, data.id),
          eq(scheduledCalls.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    return call ?? null
  })

/**
 * Update a scheduled call
 */
export const updateScheduledCall = createServerFn({ method: 'POST' })
  .inputValidator(updateScheduledCallSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Verify call exists and is pending
    // Check if scheduled call exists
    const [existingCheck] = await db
      .select()
      .from(scheduledCalls)
      .where(
        and(
          eq(scheduledCalls.id, data.id),
          eq(scheduledCalls.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!existingCheck) {
      throw new NotFoundError('Scheduled call not found', 'scheduled_call')
    }

    if (existingCheck.status !== 'pending') {
      throw new ConflictError(`Cannot update scheduled call with status "${existingCheck.status}". Only pending calls can be updated.`)
    }

    const existing = existingCheck

    const updateData: Partial<typeof scheduledCalls.$inferInsert> = {}

    if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt
    if (data.reminderAt !== undefined) updateData.reminderAt = data.reminderAt
    if (data.purpose !== undefined) {
      updateData.purpose = data.purpose as ScheduledCallPurpose
    }
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId

    // C07: Add orgId to UPDATE WHERE for tenant isolation
    const [updated] = await db
      .update(scheduledCalls)
      .set(updateData)
      .where(
        and(
          eq(scheduledCalls.id, data.id),
          eq(scheduledCalls.organizationId, ctx.organizationId),
        ),
      )
      .returning()

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'call',
      entityId: updated.id,
      action: 'updated',
      description: `Updated scheduled call: ${updated.purpose}`,
      changes: computeChanges({
        before: existing,
        after: updated,
        excludeFields: SCHEDULED_CALL_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        customerId: updated.customerId,
        callId: updated.id,
        purpose: updated.purpose,
        changedFields: Object.keys(updateData),
      },
    })

    return updated
  })

/**
 * Cancel a scheduled call
 */
export const cancelScheduledCall = createServerFn({ method: 'POST' })
  .inputValidator(cancelScheduledCallSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Get existing for logging
    // Check if scheduled call exists
    const [existingCheck] = await db
      .select()
      .from(scheduledCalls)
      .where(
        and(
          eq(scheduledCalls.id, data.id),
          eq(scheduledCalls.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!existingCheck) {
      throw new NotFoundError('Scheduled call not found', 'scheduled_call')
    }

    if (existingCheck.status !== 'pending') {
      throw new ConflictError(`Cannot cancel scheduled call with status "${existingCheck.status}". Only pending calls can be cancelled.`)
    }

    const existing = existingCheck

    // C08: Add orgId to UPDATE WHERE for tenant isolation
    const [updated] = await db
      .update(scheduledCalls)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: data.reason,
      })
      .where(
        and(
          eq(scheduledCalls.id, data.id),
          eq(scheduledCalls.organizationId, ctx.organizationId),
        ),
      )
      .returning()

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'call',
      entityId: updated.id,
      action: 'updated',
      description: `Cancelled scheduled call: ${updated.purpose}`,
      changes: computeChanges({
        before: existing,
        after: updated,
        excludeFields: SCHEDULED_CALL_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        customerId: updated.customerId,
        callId: updated.id,
        purpose: updated.purpose,
        previousStatus: existing.status,
        newStatus: updated.status,
        reason: data.reason,
      },
    })

    return updated
  })

/**
 * Reschedule a call - creates a new call and marks original as rescheduled
 */
export const rescheduleCall = createServerFn({ method: 'POST' })
  .inputValidator(rescheduleCallSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Get the original call
    // Check if scheduled call exists
    const [originalCheck] = await db
      .select()
      .from(scheduledCalls)
      .where(
        and(
          eq(scheduledCalls.id, data.id),
          eq(scheduledCalls.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!originalCheck) {
      throw new NotFoundError('Scheduled call not found', 'scheduled_call')
    }

    if (originalCheck.status !== 'pending') {
      throw new ConflictError(`Cannot reschedule scheduled call with status "${originalCheck.status}". Only pending calls can be rescheduled.`)
    }

    const original = originalCheck

    // Wrap INSERT new + UPDATE original in transaction for atomicity
    const newCall = await db.transaction(async (tx) => {
      // Create new call
      const [created] = await tx
        .insert(scheduledCalls)
        .values({
          organizationId: ctx.organizationId,
          customerId: original.customerId,
          assigneeId: original.assigneeId,
          scheduledAt: data.newScheduledAt,
          reminderAt: data.reminderAt,
          purpose: original.purpose,
          notes: data.notes ?? original.notes,
          status: 'pending',
        })
        .returning()

      // C10: Mark original as rescheduled with orgId for tenant isolation
      await tx
        .update(scheduledCalls)
        .set({
          status: 'rescheduled',
          rescheduledToId: created.id,
        })
        .where(
          and(
            eq(scheduledCalls.id, data.id),
            eq(scheduledCalls.organizationId, ctx.organizationId),
          ),
        )

      return created
    })

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'call',
      entityId: newCall.id,
      action: 'created',
      description: `Rescheduled call: ${newCall.purpose}`,
      changes: computeChanges({
        before: null,
        after: newCall,
        excludeFields: SCHEDULED_CALL_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        customerId: newCall.customerId,
        callId: newCall.id,
        purpose: newCall.purpose,
        originalCallId: data.id,
        originalScheduledAt: original.scheduledAt.toISOString(),
        newScheduledAt: newCall.scheduledAt.toISOString(),
      },
    })

    return newCall
  })

/**
 * Complete a call and log to customer activities
 */
export const completeCall = createServerFn({ method: 'POST' })
  .inputValidator(completeCallSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Get the call
    // Check if scheduled call exists
    const [callCheck] = await db
      .select()
      .from(scheduledCalls)
      .where(
        and(
          eq(scheduledCalls.id, data.id),
          eq(scheduledCalls.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!callCheck) {
      throw new NotFoundError('Scheduled call not found', 'scheduled_call')
    }

    if (callCheck.status !== 'pending') {
      throw new ConflictError(`Cannot complete scheduled call with status "${callCheck.status}". Only pending calls can be completed.`)
    }

    const call = callCheck

    // Wrap UPDATE call + INSERT activity in transaction for atomicity
    const updated = await db.transaction(async (tx) => {
      // C09: Add orgId to UPDATE WHERE for tenant isolation
      const [result] = await tx
        .update(scheduledCalls)
        .set({
          status: 'completed',
          completedAt: new Date(),
          outcome: data.outcome,
          outcomeNotes: data.outcomeNotes,
        })
        .where(
          and(
            eq(scheduledCalls.id, data.id),
            eq(scheduledCalls.organizationId, ctx.organizationId),
          ),
        )
        .returning()

      // Log to customer activities
      await tx.insert(customerActivities).values({
        organizationId: ctx.organizationId,
        customerId: call.customerId,
        createdBy: ctx.user.id,
        activityType: 'call',
        description: `Call completed: ${data.outcome.replace('_', ' ')}`,
        outcome: data.outcome,
        completedAt: new Date().toISOString(),
        metadata: {
          callId: call.id,
          purpose: call.purpose,
          outcomeNotes: data.outcomeNotes,
          scheduledAt: call.scheduledAt.toISOString(),
        },
      })

      return result
    })

    return updated
  })

// ============================================================================
// INTERNAL FUNCTIONS (for Trigger.dev jobs)
// ============================================================================

/**
 * Get calls due for reminder notification
 */
export async function getCallsDueForReminder(
  withinMinutes: number = 15,
): Promise<Array<typeof scheduledCalls.$inferSelect>> {
  const now = new Date()
  const cutoff = new Date(now.getTime() + withinMinutes * 60 * 1000)

  const calls = await db
    .select()
    .from(scheduledCalls)
    .where(
      and(
        eq(scheduledCalls.status, 'pending'),
        isNotNull(scheduledCalls.reminderAt),
        gte(scheduledCalls.reminderAt, now),
        lte(scheduledCalls.reminderAt, cutoff),
      ),
    )
    .limit(100)

  return calls
}

/**
 * Get overdue calls (scheduled time has passed but not completed)
 */
export async function getOverdueCalls(): Promise<
  Array<typeof scheduledCalls.$inferSelect>
> {
  const now = new Date()

  const calls = await db
    .select()
    .from(scheduledCalls)
    .where(
      and(
        eq(scheduledCalls.status, 'pending'),
        lte(scheduledCalls.scheduledAt, now),
      ),
    )
    .limit(100)

  return calls
}

/**
 * Get upcoming calls for a user within a time window
 */
export async function getUpcomingCallsForUser(
  userId: string,
  organizationId: string,
  hoursAhead: number = 24,
): Promise<Array<typeof scheduledCalls.$inferSelect>> {
  const now = new Date()
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)

  const calls = await db
    .select()
    .from(scheduledCalls)
    .where(
      and(
        eq(scheduledCalls.assigneeId, userId),
        eq(scheduledCalls.organizationId, organizationId),
        eq(scheduledCalls.status, 'pending'),
        gte(scheduledCalls.scheduledAt, now),
        lte(scheduledCalls.scheduledAt, cutoff),
      ),
    )
    .orderBy(scheduledCalls.scheduledAt)

  return calls
}
