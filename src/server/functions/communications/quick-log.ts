/**
 * Quick Log Server Functions
 *
 * Server-side functions for logging calls, notes, and meetings
 * with automatic activity creation.
 *
 * @see COMMS-AUTO-003
 */
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/lib/db'
import {
  activities,
  scheduledCalls,
  type ActivityMetadata,
  type ActivitySource,
} from 'drizzle/schema'
import { quickLogSchema } from '@/lib/schemas/communications'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Create a quick log entry.
 *
 * This creates an activity record and optionally a related record
 * (e.g., scheduled_calls for call logs).
 */
export const createQuickLog = createServerFn({ method: 'POST' })
  .inputValidator(quickLogSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const { type, notes, duration, customerId, opportunityId } = data

    // Determine entity type and ID
    const entityType = customerId
      ? 'customer'
      : opportunityId
        ? 'opportunity'
        : 'customer'
    const entityId = customerId ?? opportunityId

    if (!entityId) {
      throw new Error('Either customerId or opportunityId is required')
    }

    // Build description based on type
    let description: string
    let action: 'call_logged' | 'note_added'

    switch (type) {
      case 'call':
        description = duration
          ? `Outbound call (${duration} min): ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}`
          : `Outbound call: ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}`
        action = 'call_logged'
        break
      case 'meeting':
        description = duration
          ? `Meeting (${duration} min): ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}`
          : `Meeting: ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}`
        action = 'note_added' // Meetings are recorded as notes
        break
      case 'note':
      default:
        description = `Note: ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}`
        action = 'note_added'
        break
    }

    // Build metadata
    const metadata: ActivityMetadata = {
      logType: type,
      fullNotes: notes,
    }

    if (duration !== undefined) {
      metadata.durationMinutes = duration
    }

    if (opportunityId && customerId) {
      metadata.opportunityId = opportunityId
    }

    // Wrap both inserts in a transaction to ensure consistency
    return await db.transaction(async (tx) => {
      // Create the activity record
      const [activity] = await tx
        .insert(activities)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          entityType: entityType as 'customer' | 'opportunity',
          entityId,
          action,
          description,
          metadata,
          source: 'manual' as ActivitySource,
          createdBy: ctx.user.id,
        })
        .returning()

      // For calls, also create a scheduled_calls record (as completed)
      if (type === 'call' && customerId) {
        await tx.insert(scheduledCalls).values({
          organizationId: ctx.organizationId,
          assigneeId: ctx.user.id,
          customerId,
          scheduledAt: new Date(),
          purpose: 'general',
          notes,
          status: 'completed',
          completedAt: new Date(),
          outcome: 'completed',
          outcomeNotes: notes,
        })
      }

      return {
        success: true,
        activityId: activity.id,
        type,
      }
    })
  })
