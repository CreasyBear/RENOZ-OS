/**
 * Email Campaigns Server Functions
 *
 * CRUD operations for email campaigns with recipient selection.
 * Supports filtering by tags, status, and customer type.
 *
 * @see DOM-COMMS-003b
 */
import { createServerFn } from '@tanstack/react-start'
import { eq, and, inArray, sql, desc, count, isNotNull, ne, notInArray, or, ilike, gte, lte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sendCampaignTask, pauseCampaignTask } from '@/trigger/jobs'
import {
  emailCampaigns,
  campaignRecipients,
  type CampaignTemplateType,
  type CampaignTemplateData,
  type CampaignRecipientCriteria,
} from '../../../../drizzle/schema/communications'
import { contacts, customers } from '../../../../drizzle/schema/customers/customers'
import { withAuth } from '@/lib/server/protected'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { NotFoundError, ConflictError, ValidationError } from '@/lib/server/errors'
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
  sendCampaignSchema,
  pauseCampaignSchema,
  resumeCampaignSchema,
  duplicateCampaignSchema,
  testSendCampaignSchema,
} from '@/lib/schemas/communications'
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context'
import { computeChanges } from '@/lib/activity-logger'
import { logger } from '@/lib/logger'
import { customerStatusEnum, customerTypeEnum } from '../../../../drizzle/schema/_shared/enums'
import { Resend } from 'resend'
import { emailHistory, type NewEmailHistory } from '../../../../drizzle/schema/communications'
import { getResendApiKey, getEmailFrom, getEmailFromName } from '@/lib/email/config'
import { containsPattern } from '@/lib/db/utils'
import { substituteTemplateVariables, getSampleTemplateData } from '@/lib/server/email-templates'

// Excluded fields for activity logging
const CAMPAIGN_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'createdAt',
  'organizationId',
]

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build recipient query conditions from campaign criteria.
 * Shared between previewCampaignRecipients and populateCampaignRecipients.
 */
function buildRecipientConditions(
  criteria: CampaignRecipientCriteria,
  organizationId: string
) {
  const conditions = [
    eq(contacts.organizationId, organizationId),
    isNotNull(contacts.email),
    ne(contacts.email, ''),
  ]

  if (criteria.contactIds && criteria.contactIds.length > 0) {
    conditions.push(inArray(contacts.id, criteria.contactIds))
  }

  if (criteria.customerIds && criteria.customerIds.length > 0) {
    conditions.push(inArray(contacts.customerId, criteria.customerIds))
  }

  if (criteria.excludeContactIds && criteria.excludeContactIds.length > 0) {
    conditions.push(notInArray(contacts.id, criteria.excludeContactIds))
  }

  if (criteria.statuses && criteria.statuses.length > 0) {
    const validStatuses = criteria.statuses.filter((status) =>
      customerStatusEnum.enumValues.includes(status as typeof customerStatusEnum.enumValues[number])
    ) as typeof customerStatusEnum.enumValues[number][];

    if (validStatuses.length > 0) {
      const customerStatusSubquery = db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, organizationId),
            inArray(customers.status, validStatuses)
          )
        )
      conditions.push(inArray(contacts.customerId, customerStatusSubquery))
    }
  }

  if (criteria.customerTypes && criteria.customerTypes.length > 0) {
    const validTypes = criteria.customerTypes.filter((type) =>
      customerTypeEnum.enumValues.includes(type as typeof customerTypeEnum.enumValues[number])
    ) as typeof customerTypeEnum.enumValues[number][];

    if (validTypes.length > 0) {
      const customerTypeSubquery = db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, organizationId),
            inArray(customers.type, validTypes)
          )
        )
      conditions.push(inArray(contacts.customerId, customerTypeSubquery))
    }
  }

  // RAW SQL (Phase 11 Keep): tags ?| array (Postgres jsonb). Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
  if (criteria.tags && criteria.tags.length > 0) {
    conditions.push(
      sql`${contacts.customerId} IN (
        SELECT id FROM customers
        WHERE organization_id = ${organizationId}
        AND tags ?| array[${sql.join(criteria.tags.map((t: string) => sql`${t}`), sql`, `)}]
      )`,
    )
  }

  return conditions
}

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Create a new email campaign
 */
export const createCampaign = createServerFn({ method: 'POST' })
  .inputValidator(createCampaignSchema)
  .handler(async ({ data }): Promise<typeof emailCampaigns.$inferSelect> => {
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

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'email',
      entityId: campaign.id,
      action: 'created',
      description: `Created email campaign: ${campaign.name}`,
      changes: computeChanges({
        before: null,
        after: campaign,
        excludeFields: CAMPAIGN_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        campaignName: campaign.name,
        templateType: campaign.templateType,
        status: campaign.status,
        scheduledAt: campaign.scheduledAt?.toISOString(),
      },
    })

    return campaign
  })

/**
 * Update an existing campaign (only draft/scheduled campaigns)
 */
export const updateCampaign = createServerFn({ method: 'POST' })
  .inputValidator(updateCampaignSchema)
  .handler(async ({ data }): Promise<typeof emailCampaigns.$inferSelect> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Check campaign exists and is editable
    // Check if campaign exists
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

    if (!campaign) {
      throw new NotFoundError('Campaign not found', 'campaign')
    }

    // Check if campaign can be edited (must be draft or scheduled)
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      throw new ConflictError(`Cannot edit campaign with status "${campaign.status}". Only draft or scheduled campaigns can be edited.`)
    }

    const existing = campaign

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

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'email',
      entityId: updated.id,
      action: 'updated',
      description: `Updated email campaign: ${updated.name}`,
      changes: computeChanges({
        before: existing,
        after: updated,
        excludeFields: CAMPAIGN_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        campaignName: updated.name,
        changedFields: Object.keys(updateData),
      },
    })

    return updated
  })

/**
 * Get campaigns with optional filters (status, search, templateType, date range)
 */
export const getCampaigns = createServerFn({ method: 'GET' })
  .inputValidator(getCampaignsSchema)
  .handler(async ({ data }): Promise<{ items: typeof emailCampaigns.$inferSelect[]; total: number }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read })

    const conditions = [eq(emailCampaigns.organizationId, ctx.organizationId)]

    if (data.status) {
      conditions.push(eq(emailCampaigns.status, data.status))
    }

    if (data.search && data.search.trim()) {
      const searchPattern = containsPattern(data.search.trim())
      const searchConditions = [
        ilike(emailCampaigns.name, searchPattern),
        emailCampaigns.description
          ? ilike(emailCampaigns.description, searchPattern)
          : undefined
      ].filter((c): c is typeof c => c !== undefined);
      
      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions)!);
      }
    }

    if (data.templateType) {
      conditions.push(eq(emailCampaigns.templateType, data.templateType as CampaignTemplateType))
    }

    if (data.dateFrom) {
      conditions.push(gte(emailCampaigns.createdAt, data.dateFrom))
    }

    if (data.dateTo) {
      // Add 1 day to include the entire end date
      const endDate = new Date(data.dateTo)
      endDate.setHours(23, 59, 59, 999)
      conditions.push(lte(emailCampaigns.createdAt, endDate))
    }

    const results = await db
      .select()
      .from(emailCampaigns)
      .where(and(...conditions))
      .orderBy(desc(emailCampaigns.createdAt))
      .limit(data.limit)
      .offset(data.offset)

    const [countResult] = await db
      .select({ count: count() })
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
  .handler(async ({ data }): Promise<typeof emailCampaigns.$inferSelect | null> => {
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
      throw new NotFoundError('Campaign not found', 'campaign')
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
      .select({ count: count() })
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

    // Build the query conditions using shared helper
    const conditions = buildRecipientConditions(criteria, ctx.organizationId)

    // Get total count
    // NOTE: COUNT(DISTINCT ...) is used here to count unique emails
    // Drizzle's count() function doesn't support DISTINCT directly, so raw SQL is used
    // This is acceptable as it's a standard SQL pattern
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

    // Check if campaign exists
    const [campaignCheck] = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, data.campaignId),
          eq(emailCampaigns.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!campaignCheck) {
      throw new NotFoundError('Campaign not found', 'campaign')
    }

    // Check if campaign can have recipients added (must be draft or scheduled)
    if (!['draft', 'scheduled'].includes(campaignCheck.status)) {
      throw new ConflictError(`Cannot add recipients to campaign with status "${campaignCheck.status}". Only draft or scheduled campaigns can have recipients added.`)
    }

    const campaign = campaignCheck

    const criteria = (campaign.recipientCriteria ?? {}) as CampaignRecipientCriteria

    // Build query conditions using shared helper
    const conditions = buildRecipientConditions(criteria, ctx.organizationId)

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

    // Dedupe by email
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

    // Wrap delete + insert + update in a transaction for atomicity
    await db.transaction(async (tx) => {
      // Remove existing recipients (in case of re-population)
      await tx
        .delete(campaignRecipients)
        .where(eq(campaignRecipients.campaignId, data.campaignId))

      // Insert new recipients
      if (recipientsToInsert.length > 0) {
        await tx.insert(campaignRecipients).values(recipientsToInsert)
      }

      // Update campaign recipient count
      await tx
        .update(emailCampaigns)
        .set({ recipientCount: recipientsToInsert.length })
        .where(eq(emailCampaigns.id, data.campaignId))
    })

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'email',
      entityId: data.campaignId,
      action: 'updated',
      description: `Populated campaign recipients: ${campaign.name}`,
      metadata: {
        campaignId: data.campaignId,
        campaignName: campaign.name,
        recipientCount: recipientsToInsert.length,
      },
    })

    return {
      recipientCount: recipientsToInsert.length,
    }
  })

/**
 * Cancel a campaign (only draft/scheduled/sending)
 */
export const cancelCampaign = createServerFn({ method: 'POST' })
  .inputValidator(cancelCampaignSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Get existing campaign for logging
    // Check if campaign exists
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

    if (!campaign) {
      throw new NotFoundError('Campaign not found', 'campaign')
    }

    // Check if campaign can be cancelled (must be draft, scheduled, sending, or paused)
    if (!['draft', 'scheduled', 'sending', 'paused'].includes(campaign.status)) {
      throw new ConflictError(`Cannot cancel campaign with status "${campaign.status}". Only draft, scheduled, sending, or paused campaigns can be cancelled.`)
    }

    const existing = campaign

    const [updated] = await db
      .update(emailCampaigns)
      .set({
        status: 'cancelled',
      })
      .where(eq(emailCampaigns.id, data.id))
      .returning()

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'email',
      entityId: updated.id,
      action: 'updated',
      description: `Cancelled email campaign: ${updated.name}`,
      changes: computeChanges({
        before: existing,
        after: updated,
        excludeFields: CAMPAIGN_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        campaignName: updated.name,
        previousStatus: existing.status,
        newStatus: updated.status,
      },
    })

    return updated
  })

/**
 * Delete a campaign (only draft campaigns)
 */
export const deleteCampaign = createServerFn({ method: 'POST' })
  .inputValidator(deleteCampaignSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.delete })

    // Check if campaign exists and can be deleted
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

    if (!campaign) {
      throw new NotFoundError('Campaign not found', 'campaign')
    }

    if (campaign.status !== 'draft') {
      throw new ConflictError(`Cannot delete campaign with status "${campaign.status}". Only draft campaigns can be deleted.`)
    }

    const [deleted] = await db
      .delete(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, data.id),
          eq(emailCampaigns.organizationId, ctx.organizationId),
        ),
      )
      .returning()

    if (!deleted) {
      throw new NotFoundError('Campaign not found', 'campaign')
    }

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'email',
      entityId: deleted.id,
      action: 'deleted',
      description: `Deleted email campaign: ${deleted.name}`,
      changes: computeChanges({
        before: deleted,
        after: null,
        excludeFields: CAMPAIGN_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        campaignName: deleted.name,
      },
    })

    return { success: true }
  })

/**
 * Send a campaign (triggers Trigger.dev task)
 * Only works for draft, scheduled, or paused campaigns
 */
export const sendCampaign = createServerFn({ method: 'POST' })
  .inputValidator(sendCampaignSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Verify campaign exists and can be sent
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

    if (!campaign) {
      throw new NotFoundError('Campaign not found', 'campaign')
    }

    // Check if campaign can be sent (must be draft, scheduled, or paused)
    if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
      throw new ConflictError(`Cannot send campaign with status "${campaign.status}". Only draft, scheduled, or paused campaigns can be sent.`)
    }

    // Verify campaign has recipients
    const [recipientCount] = await db
      .select({ count: count() })
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, data.id))

    if (Number(recipientCount?.count ?? 0) === 0) {
      throw new ValidationError('Campaign has no recipients. Please add recipients before sending.')
    }

    // Trigger the send task
    await sendCampaignTask.trigger({ campaignId: data.id })

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'email',
      entityId: campaign.id,
      action: 'updated',
      description: `Started sending email campaign: ${campaign.name}`,
      metadata: {
        campaignName: campaign.name,
        previousStatus: campaign.status,
        newStatus: 'sending',
      },
    })

    return { success: true, campaignId: data.id }
  })

/**
 * Pause a sending campaign
 */
export const pauseCampaign = createServerFn({ method: 'POST' })
  .inputValidator(pauseCampaignSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Check if campaign exists
    const [campaignCheck] = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, data.id),
          eq(emailCampaigns.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!campaignCheck) {
      throw new NotFoundError('Campaign not found', 'campaign')
    }

    // Check if campaign is currently sending
    if (campaignCheck.status !== 'sending') {
      throw new ConflictError(`Campaign is not currently sending. Current status: "${campaignCheck.status}".`)
    }

    const campaign = campaignCheck

    // Trigger the pause task
    await pauseCampaignTask.trigger({ campaignId: data.id })

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'email',
      entityId: campaign.id,
      action: 'updated',
      description: `Paused email campaign: ${campaign.name}`,
      metadata: {
        campaignName: campaign.name,
        previousStatus: campaign.status,
        newStatus: 'paused',
      },
    })

    return { success: true, campaignId: data.id }
  })

/**
 * Resume a paused campaign (triggers send task)
 */
export const resumeCampaign = createServerFn({ method: 'POST' })
  .inputValidator(resumeCampaignSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Check if campaign exists
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

    if (!campaign) {
      throw new NotFoundError('Campaign not found', 'campaign')
    }

    // Check if campaign is paused
    if (campaign.status !== 'paused') {
      throw new ConflictError(`Campaign is not paused. Current status: "${campaign.status}".`)
    }

    // Trigger the send task (same as sending)
    await sendCampaignTask.trigger({ campaignId: data.id })

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'email',
      entityId: campaign.id,
      action: 'updated',
      description: `Resumed email campaign: ${campaign.name}`,
      metadata: {
        campaignName: campaign.name,
        previousStatus: campaign.status,
        newStatus: 'sending',
      },
    })

    return { success: true, campaignId: data.id }
  })

/**
 * Duplicate/clone a campaign
 * Creates a new campaign with the same configuration but as draft
 */
export const duplicateCampaign = createServerFn({ method: 'POST' })
  .inputValidator(duplicateCampaignSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Get the original campaign
    const [original] = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, data.id),
          eq(emailCampaigns.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!original) {
      throw new NotFoundError('Campaign not found', 'campaign')
    }

    // Create duplicate with "Copy of" prefix if name not provided
    const duplicateName = data.name || `Copy of ${original.name}`

    const [duplicated] = await db
      .insert(emailCampaigns)
      .values({
        organizationId: ctx.organizationId,
        name: duplicateName,
        description: original.description,
        templateType: original.templateType,
        templateData: original.templateData,
        recipientCriteria: original.recipientCriteria,
        status: 'draft', // Always create as draft
        scheduledAt: null, // Clear schedule
        createdById: ctx.user.id,
      })
      .returning()

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx)
    logger.logAsync({
      entityType: 'email',
      entityId: duplicated.id,
      action: 'created',
      description: `Duplicated email campaign: ${duplicated.name} (from ${original.name})`,
      metadata: {
        campaignName: duplicated.name,
      },
    })

    return duplicated
  })

/**
 * Get template content based on template type
 * Matches the template structure used in send-campaign.ts
 */
function getTemplateContent(
  templateType: string
): { subject: string; body: string } {
  const templates: Record<string, { subject: string; body: string }> = {
    welcome: {
      subject: "Welcome to {{company_name}}, {{first_name}}!",
      body: `<html><body>
        <h1>Welcome, {{first_name}}!</h1>
        <p>Thank you for joining {{company_name}}. We're excited to have you!</p>
        <p>If you have any questions, don't hesitate to reach out.</p>
        <p>Best regards,<br>The {{company_name}} Team</p>
      </body></html>`,
    },
    follow_up: {
      subject: "Following up on {{subject_context}}",
      body: `<html><body>
        <p>Hi {{first_name}},</p>
        <p>I wanted to follow up on {{subject_context}}.</p>
        <p>Please let me know if you have any questions.</p>
        <p>Best regards,<br>{{sender_name}}</p>
      </body></html>`,
    },
    newsletter: {
      subject: "{{newsletter_title}}",
      body: `<html><body>
        <h1>{{newsletter_title}}</h1>
        <p>{{newsletter_content}}</p>
        <p>Best regards,<br>The {{company_name}} Team</p>
        <p><small><a href="{{unsubscribe_url}}">Unsubscribe</a></small></p>
      </body></html>`,
    },
    promotion: {
      subject: "{{promotion_title}} - {{discount_amount}} Off!",
      body: `<html><body>
        <h1>{{promotion_title}}</h1>
        <p>Hi {{first_name}},</p>
        <p>Don't miss out on our special offer: {{discount_amount}} off!</p>
        <p>{{promotion_details}}</p>
        <p><a href="{{promotion_url}}">Shop Now</a></p>
        <p>Offer valid until {{expiry_date}}.</p>
        <p>Best regards,<br>The {{company_name}} Team</p>
        <p><small><a href="{{unsubscribe_url}}">Unsubscribe</a></small></p>
      </body></html>`,
    },
    announcement: {
      subject: "Important Announcement: {{announcement_title}}",
      body: `<html><body>
        <h1>{{announcement_title}}</h1>
        <p>Hi {{first_name}},</p>
        <p>{{announcement_content}}</p>
        <p>Best regards,<br>The {{company_name}} Team</p>
        <p><small><a href="{{unsubscribe_url}}">Unsubscribe</a></small></p>
      </body></html>`,
    },
    custom: {
      subject: "{{subject}}",
      body: "{{body}}",
    },
  };

  return templates[templateType] || templates.custom;
}

/**
 * Send a test email for a campaign
 * Sends to a single test email address without creating recipients
 */
export const testSendCampaign = createServerFn({ method: 'POST' })
  .inputValidator(testSendCampaignSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update })

    // Verify campaign exists
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, data.campaignId),
          eq(emailCampaigns.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)

    if (!campaign) {
      throw new NotFoundError('Campaign not found', 'campaign')
    }

    // Get Resend API key (throws ServerError if not configured)
    const resendApiKey = getResendApiKey();

    // Get template content based on campaign template type
    const template = getTemplateContent(campaign.templateType);
    const campaignData = (campaign.templateData ?? {}) as CampaignTemplateData;
    const campaignVariables = (campaignData.variables ?? {}) as Record<
      string,
      string | number | boolean
    >;

    // Build variables: start with sample data, overlay campaign variables
    const sampleData = getSampleTemplateData();
    const variables: Record<string, string | number | boolean> = {
      first_name: 'Test',
      email: data.testEmail,
      company_name: sampleData.company.name,
      sender_name: ctx.user.name || 'Renoz Team',
      ...campaignVariables,
    };

    // Check for subject/body override in campaign data
    const subject = campaignData.subjectOverride
      ? `[TEST] ${substituteTemplateVariables(String(campaignData.subjectOverride), variables)}`
      : `[TEST] ${substituteTemplateVariables(template.subject, variables)}`;
    
    const bodyHtml = campaignData.bodyOverride
      ? substituteTemplateVariables(String(campaignData.bodyOverride), variables)
      : substituteTemplateVariables(template.body, variables);
    
    // Convert HTML to plain text (simple conversion for email clients)
    const bodyText = bodyHtml
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Get sender email from config
    const fromEmail = getEmailFrom();
    const fromName = getEmailFromName();
    const fromAddress = `${fromName} <${fromEmail}>`;

    // Create email history record
    const [emailRecord] = await db
      .insert(emailHistory)
      .values({
        organizationId: campaign.organizationId,
        senderId: ctx.user.id,
        fromAddress,
        toAddress: data.testEmail,
        subject,
        bodyHtml,
        bodyText,
        status: 'pending',
        campaignId: campaign.id,
      } as NewEmailHistory)
      .returning();

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: [data.testEmail],
      subject,
      html: bodyHtml,
      text: bodyText,
    });

    if (sendError) {
      // Update email history with failure
      await db
        .update(emailHistory)
        .set({ status: 'failed' })
        .where(eq(emailHistory.id, emailRecord.id));

      throw new Error(`Failed to send test email: ${sendError.message}`);
    }

    // Update email history with success and Resend message ID
    await db
      .update(emailHistory)
      .set({
        status: 'sent',
        sentAt: new Date(),
        resendMessageId: sendResult?.id,
      })
      .where(eq(emailHistory.id, emailRecord.id));

    logger.info('Test email sent successfully', {
      domain: 'communications',
      campaignId: campaign.id,
      testEmail: data.testEmail,
      emailHistoryId: emailRecord.id,
      resendMessageId: sendResult?.id,
    });

    // Activity logging
    const activityLogger = createActivityLoggerWithContext(ctx)
    await activityLogger.logAsync({
      entityType: 'email',
      entityId: campaign.id,
      action: 'updated',
      description: `Sent test email for campaign: ${campaign.name} to ${data.testEmail}`,
      metadata: {
        campaignName: campaign.name,
        recipientEmail: data.testEmail,
        emailId: emailRecord.id,
      },
    })

    return { 
      success: true, 
      testEmail: data.testEmail,
      messageId: sendResult?.id,
      emailHistoryId: emailRecord.id,
    }
  })
