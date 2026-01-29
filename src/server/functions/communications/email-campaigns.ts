/**
 * Email Campaigns Server Functions
 *
 * CRUD operations for email campaigns with recipient selection.
 * Supports filtering by tags, status, and customer type.
 *
 * @see DOM-COMMS-003b
 */
import { createServerFn } from '@tanstack/react-start'
import { eq, and, inArray, sql, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  emailCampaigns,
  campaignRecipients,
  type CampaignTemplateType,
  type CampaignTemplateData,
  type CampaignRecipientCriteria,
} from '../../../../drizzle/schema/communications'
import { contacts } from '../../../../drizzle/schema/customers/customers'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'
import {
  createCampaignSchema,
  updateCampaignSchema,
  getCampaignsSchema,
  getCampaignByIdSchema,
  getCampaignRecipientsSchema,
  previewRecipientsSchema,
  cancelCampaignSchema,
  populateCampaignRecipientsSchema,
  deleteCampaignSchema,
} from '@/lib/schemas/communications'

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Create a new email campaign
 */
export const createCampaign = createServerFn({ method: 'POST' })
  .inputValidator(createCampaignSchema)
  // @ts-expect-error - TanStack Start ServerFn type inference mismatch with handler signature
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    const [campaign] = await db
      .insert(emailCampaigns)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        description: data.description,
        templateType: data.templateType as CampaignTemplateType,
        templateData: (data.templateData ?? {}) as CampaignTemplateData,
        recipientCriteria: (data.recipientCriteria ?? {}) as CampaignRecipientCriteria,
        scheduledAt: data.scheduledAt,
        status: data.scheduledAt ? 'scheduled' : 'draft',
        createdById: ctx.user.id,
      })
      .returning()

    return campaign
  })

/**
 * Update an existing campaign (only draft/scheduled campaigns)
 */
export const updateCampaign = createServerFn({ method: 'POST' })
  .inputValidator(updateCampaignSchema)
  // @ts-expect-error - TanStack Start ServerFn type inference mismatch with handler signature
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Check campaign exists and is editable
    const [existing] = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, data.id),
          eq(emailCampaigns.organizationId, ctx.organizationId),
          inArray(emailCampaigns.status, ['draft', 'scheduled']),
        ),
      )
      .limit(1)

    if (!existing) {
      throw new Error('Campaign not found or cannot be edited')
    }

    const updateData: Partial<typeof emailCampaigns.$inferInsert> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.templateType !== undefined)
      updateData.templateType = data.templateType as CampaignTemplateType
    if (data.templateData !== undefined)
      updateData.templateData = data.templateData as CampaignTemplateData
    if (data.recipientCriteria !== undefined)
      updateData.recipientCriteria = data.recipientCriteria as CampaignRecipientCriteria
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = data.scheduledAt
      updateData.status = data.scheduledAt ? 'scheduled' : 'draft'
    }

    const [updated] = await db
      .update(emailCampaigns)
      .set(updateData)
      .where(eq(emailCampaigns.id, data.id))
      .returning()

    return updated
  })

/**
 * Get campaigns with optional status filter
 */
export const getCampaigns = createServerFn({ method: 'GET' })
  .inputValidator(getCampaignsSchema)
  // @ts-expect-error - TanStack Start ServerFn type inference mismatch with handler signature
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const conditions = [eq(emailCampaigns.organizationId, ctx.organizationId)]

    if (data.status) {
      conditions.push(eq(emailCampaigns.status, data.status))
    }

    const results = await db
      .select()
      .from(emailCampaigns)
      .where(and(...conditions))
      .orderBy(desc(emailCampaigns.createdAt))
      .limit(data.limit)
      .offset(data.offset)

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailCampaigns)
      .where(and(...conditions))

    return {
      items: results,
      total: Number(countResult?.count ?? 0),
    }
  })

/**
 * Get a single campaign by ID
 */
export const getCampaignById = createServerFn({ method: 'GET' })
  .inputValidator(getCampaignByIdSchema)
  // @ts-expect-error - TanStack Start ServerFn type inference mismatch with handler signature
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, data.id),
          eq(emailCampaigns.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    return campaign ?? null
  })

/**
 * Get recipients for a campaign with filtering
 */
export const getCampaignRecipients = createServerFn({ method: 'GET' })
  .inputValidator(getCampaignRecipientsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    // Verify campaign belongs to organization
    const [campaign] = await db
      .select({ id: emailCampaigns.id })
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, data.campaignId),
          eq(emailCampaigns.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const conditions = [eq(campaignRecipients.campaignId, data.campaignId)]

    if (data.status) {
      conditions.push(eq(campaignRecipients.status, data.status))
    }

    const results = await db
      .select({
        id: campaignRecipients.id,
        email: campaignRecipients.email,
        name: campaignRecipients.name,
        contactId: campaignRecipients.contactId,
        status: campaignRecipients.status,
        sentAt: campaignRecipients.sentAt,
        openedAt: campaignRecipients.openedAt,
        clickedAt: campaignRecipients.clickedAt,
        errorMessage: campaignRecipients.errorMessage,
      })
      .from(campaignRecipients)
      .where(and(...conditions))
      .orderBy(desc(campaignRecipients.createdAt))
      .limit(data.limit)
      .offset(data.offset)

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaignRecipients)
      .where(and(...conditions))

    return {
      items: results,
      total: Number(countResult?.count ?? 0),
    }
  })

/**
 * Preview recipients based on criteria without creating a campaign
 * Returns count and sample contacts
 */
export const previewCampaignRecipients = createServerFn({ method: 'POST' })
  .inputValidator(previewRecipientsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const criteria = data.recipientCriteria

    // Build the query conditions
    const conditions = [
      eq(contacts.organizationId, ctx.organizationId),
      sql`${contacts.email} IS NOT NULL`,
      sql`${contacts.email} != ''`,
    ]

    // Filter by specific contact IDs
    if (criteria.contactIds && criteria.contactIds.length > 0) {
      conditions.push(inArray(contacts.id, criteria.contactIds))
    }

    // Filter by customer IDs (contacts belonging to those customers)
    if (criteria.customerIds && criteria.customerIds.length > 0) {
      conditions.push(inArray(contacts.customerId, criteria.customerIds))
    }

    // Exclude specific contacts
    if (criteria.excludeContactIds && criteria.excludeContactIds.length > 0) {
      conditions.push(
        sql`${contacts.id} NOT IN (${sql.join(criteria.excludeContactIds.map((id: string) => sql`${id}`), sql`, `)})`,
      )
    }

    // Filter by customer status (join with customers table)
    if (criteria.statuses && criteria.statuses.length > 0) {
      // This requires a join - we'll use a subquery approach
      conditions.push(
        sql`${contacts.customerId} IN (
          SELECT id FROM customers
          WHERE organization_id = ${ctx.organizationId}
          AND status IN (${sql.join(criteria.statuses.map((s: string) => sql`${s}`), sql`, `)})
        )`,
      )
    }

    // Filter by customer type
    if (criteria.customerTypes && criteria.customerTypes.length > 0) {
      conditions.push(
        sql`${contacts.customerId} IN (
          SELECT id FROM customers
          WHERE organization_id = ${ctx.organizationId}
          AND type IN (${sql.join(criteria.customerTypes.map((t: string) => sql`${t}`), sql`, `)})
        )`,
      )
    }

    // Filter by tags (customers with matching tags)
    if (criteria.tags && criteria.tags.length > 0) {
      // Tags are stored as JSON array in customers.tags
      conditions.push(
        sql`${contacts.customerId} IN (
          SELECT id FROM customers
          WHERE organization_id = ${ctx.organizationId}
          AND tags ?| array[${sql.join(criteria.tags.map((t: string) => sql`${t}`), sql`, `)}]
        )`,
      )
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(DISTINCT ${contacts.email})` })
      .from(contacts)
      .where(and(...conditions))

    const total = Number(countResult?.count ?? 0)

    // Get sample recipients
    const sample = await db
      .select({
        id: contacts.id,
        email: contacts.email,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        customerId: contacts.customerId,
      })
      .from(contacts)
      .where(and(...conditions))
      .limit(data.sampleSize)

    return {
      total,
      sample: sample.map((c) => ({
        id: c.id,
        email: c.email,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || null,
        customerId: c.customerId,
      })),
    }
  })

/**
 * Populate campaign recipients based on criteria
 * Called before sending a campaign
 */
export const populateCampaignRecipients = createServerFn({ method: 'POST' })
  .inputValidator(populateCampaignRecipientsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Get campaign with criteria
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, data.campaignId),
          eq(emailCampaigns.organizationId, ctx.organizationId),
          inArray(emailCampaigns.status, ['draft', 'scheduled']),
        ),
      )
      .limit(1)

    if (!campaign) {
      throw new Error('Campaign not found or cannot add recipients')
    }

    const criteria = (campaign.recipientCriteria ?? {}) as CampaignRecipientCriteria

    // Build query conditions (same as preview)
    const conditions = [
      eq(contacts.organizationId, ctx.organizationId),
      sql`${contacts.email} IS NOT NULL`,
      sql`${contacts.email} != ''`,
    ]

    if (criteria.contactIds && criteria.contactIds.length > 0) {
      conditions.push(inArray(contacts.id, criteria.contactIds))
    }

    if (criteria.customerIds && criteria.customerIds.length > 0) {
      conditions.push(inArray(contacts.customerId, criteria.customerIds))
    }

    if (criteria.excludeContactIds && criteria.excludeContactIds.length > 0) {
      conditions.push(
        sql`${contacts.id} NOT IN (${sql.join(criteria.excludeContactIds.map((id: string) => sql`${id}`), sql`, `)})`,
      )
    }

    if (criteria.statuses && criteria.statuses.length > 0) {
      conditions.push(
        sql`${contacts.customerId} IN (
          SELECT id FROM customers
          WHERE organization_id = ${ctx.organizationId}
          AND status IN (${sql.join(criteria.statuses.map((s: string) => sql`${s}`), sql`, `)})
        )`,
      )
    }

    if (criteria.customerTypes && criteria.customerTypes.length > 0) {
      conditions.push(
        sql`${contacts.customerId} IN (
          SELECT id FROM customers
          WHERE organization_id = ${ctx.organizationId}
          AND type IN (${sql.join(criteria.customerTypes.map((t: string) => sql`${t}`), sql`, `)})
        )`,
      )
    }

    if (criteria.tags && criteria.tags.length > 0) {
      conditions.push(
        sql`${contacts.customerId} IN (
          SELECT id FROM customers
          WHERE organization_id = ${ctx.organizationId}
          AND tags ?| array[${sql.join(criteria.tags.map((t: string) => sql`${t}`), sql`, `)}]
        )`,
      )
    }

    // Get all matching contacts
    const matchingContacts = await db
      .select({
        id: contacts.id,
        email: contacts.email,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
      })
      .from(contacts)
      .where(and(...conditions))

    // Remove existing recipients (in case of re-population)
    await db
      .delete(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, data.campaignId))

    // Insert new recipients (dedupe by email)
    const uniqueEmails = new Map<string, typeof matchingContacts[0]>()
    for (const contact of matchingContacts) {
      if (contact.email && !uniqueEmails.has(contact.email.toLowerCase())) {
        uniqueEmails.set(contact.email.toLowerCase(), contact)
      }
    }

    const recipientsToInsert = Array.from(uniqueEmails.values()).map((contact) => ({
      organizationId: ctx.organizationId,
      campaignId: data.campaignId,
      contactId: contact.id,
      email: contact.email!,
      name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || null,
      status: 'pending' as const,
    }))

    if (recipientsToInsert.length > 0) {
      await db.insert(campaignRecipients).values(recipientsToInsert)
    }

    // Update campaign recipient count
    await db
      .update(emailCampaigns)
      .set({ recipientCount: recipientsToInsert.length })
      .where(eq(emailCampaigns.id, data.campaignId))

    return {
      recipientCount: recipientsToInsert.length,
    }
  })

/**
 * Cancel a campaign (only draft/scheduled/sending)
 */
export const cancelCampaign = createServerFn({ method: 'POST' })
  .inputValidator(cancelCampaignSchema)
  // @ts-expect-error - TanStack Start ServerFn type inference mismatch with handler signature
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    const [updated] = await db
      .update(emailCampaigns)
      .set({
        status: 'cancelled',
      })
      .where(
        and(
          eq(emailCampaigns.id, data.id),
          eq(emailCampaigns.organizationId, ctx.organizationId),
          inArray(emailCampaigns.status, ['draft', 'scheduled', 'sending', 'paused']),
        ),
      )
      .returning()

    if (!updated) {
      throw new Error('Campaign not found or cannot be cancelled')
    }

    return updated
  })

/**
 * Delete a campaign (only draft campaigns)
 */
export const deleteCampaign = createServerFn({ method: 'POST' })
  .inputValidator(deleteCampaignSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.delete })

    const [deleted] = await db
      .delete(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, data.id),
          eq(emailCampaigns.organizationId, ctx.organizationId),
          eq(emailCampaigns.status, 'draft'),
        ),
      )
      .returning()

    if (!deleted) {
      throw new Error('Campaign not found or cannot be deleted')
    }

    return { success: true }
  })
