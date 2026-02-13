/**
 * Communication Preferences Server Functions
 *
 * Manages contact communication preferences (email/SMS opt-in).
 * Logs all preference changes to activities for GDPR/CAN-SPAM compliance.
 *
 * @see DOM-COMMS-005
 */
import { createServerFn } from '@tanstack/react-start'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contacts, customerActivities } from 'drizzle/schema'
import {
  updatePreferencesSchema,
  getPreferencesSchema,
  getPreferenceHistorySchema,
} from '@/lib/schemas/communications'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { NotFoundError } from '@/lib/server/errors'

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Get communication preferences for a contact
 */
export const getContactPreferences = createServerFn({ method: 'GET' })
  .inputValidator(getPreferencesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const [contact] = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        emailOptIn: contacts.emailOptIn,
        smsOptIn: contacts.smsOptIn,
        emailOptInAt: contacts.emailOptInAt,
        smsOptInAt: contacts.smsOptInAt,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.id, data.contactId),
          eq(contacts.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!contact) {
      throw new NotFoundError('Contact not found', 'contact')
    }

    return contact
  })

/**
 * Update communication preferences for a contact
 * Logs changes to activities for compliance audit trail
 */
export const updateContactPreferences = createServerFn({ method: 'POST' })
  .inputValidator(updatePreferencesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Get current preferences
    const [contact] = await db
      .select({
        id: contacts.id,
        customerId: contacts.customerId,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        emailOptIn: contacts.emailOptIn,
        smsOptIn: contacts.smsOptIn,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.id, data.contactId),
          eq(contacts.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!contact) {
      throw new NotFoundError('Contact not found', 'contact')
    }

    const now = new Date().toISOString()
    const updateData: Partial<typeof contacts.$inferInsert> = {}
    const changes: { field: string; oldValue: boolean; newValue: boolean }[] = []

    // Track email preference changes
    if (data.emailOptIn !== undefined && data.emailOptIn !== contact.emailOptIn) {
      updateData.emailOptIn = data.emailOptIn
      updateData.emailOptInAt = now
      changes.push({
        field: 'emailOptIn',
        oldValue: contact.emailOptIn,
        newValue: data.emailOptIn,
      })
    }

    // Track SMS preference changes
    if (data.smsOptIn !== undefined && data.smsOptIn !== contact.smsOptIn) {
      updateData.smsOptIn = data.smsOptIn
      updateData.smsOptInAt = now
      changes.push({
        field: 'smsOptIn',
        oldValue: contact.smsOptIn,
        newValue: data.smsOptIn,
      })
    }

    if (Object.keys(updateData).length === 0) {
      return contact
    }

    // Wrap UPDATE + activity INSERTs in transaction for atomicity
    await db.transaction(async (tx) => {
      // Update contact
      await tx
        .update(contacts)
        .set(updateData)
        .where(
          and(
            eq(contacts.id, data.contactId),
            eq(contacts.organizationId, ctx.organizationId),
          ),
        )

      // Log changes to activities
      for (const change of changes) {
        await tx.insert(customerActivities).values({
          organizationId: ctx.organizationId,
          customerId: contact.customerId,
          createdBy: ctx.user.id,
          activityType: 'note',
          description: `Updated ${change.field}: ${change.oldValue ? 'opted in' : 'opted out'} → ${change.newValue ? 'opted in' : 'opted out'}`,
          metadata: {
            preferenceChange: true,
            contactId: contact.id,
            contactName: `${contact.firstName} ${contact.lastName}`.trim(),
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            changedAt: now,
          },
        })
      }
    })

    return {
      ...contact,
      ...updateData,
    }
  })

/**
 * Get preference change history
 */
export const getPreferenceHistory = createServerFn({ method: 'GET' })
  .inputValidator(getPreferenceHistorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const conditions = [
      eq(customerActivities.organizationId, ctx.organizationId),
      // M01: Filter preference changes in SQL instead of in-memory
      sql`${customerActivities.metadata}->>'preferenceChange' = 'true'`,
    ]

    if (data.contactId) {
      conditions.push(eq(customerActivities.contactId, data.contactId))
    }

    if (data.customerId) {
      conditions.push(eq(customerActivities.customerId, data.customerId))
    }

    const results = await db
      .select()
      .from(customerActivities)
      .where(and(...conditions))
      .orderBy(desc(customerActivities.createdAt))
      .limit(data.limit)
      .offset(data.offset)

    return {
      items: results,
      total: results.length,
    }
  })
