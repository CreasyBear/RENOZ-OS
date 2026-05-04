import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import { ConflictError, NotFoundError } from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { campaignRecipients, emailCampaigns, type CampaignRecipientCriteria } from 'drizzle/schema/communications';
import { contacts, customers } from 'drizzle/schema';
import type { GetCampaignRecipientsInput, PopulateCampaignRecipientsInput, PreviewRecipientsInput } from '@/lib/schemas/communications';
import { buildCampaignRecipientConditions } from './campaign-recipient-selection';

export async function readCampaignRecipients(
  ctx: SessionContext,
  data: GetCampaignRecipientsInput
) {
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
        customerId: campaignRecipients.customerId,
        customerName: customers.name,
        status: campaignRecipients.status,
        sentAt: campaignRecipients.sentAt,
        openedAt: campaignRecipients.openedAt,
        clickedAt: campaignRecipients.clickedAt,
        errorMessage: campaignRecipients.errorMessage,
      })
      .from(campaignRecipients)
      .leftJoin(customers, eq(campaignRecipients.customerId, customers.id))
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
}

export async function previewCampaignRecipientSelection(
  ctx: SessionContext,
  data: PreviewRecipientsInput
) {
    const criteria = data.recipientCriteria

    // Build the query conditions using shared helper
    const conditions = buildCampaignRecipientConditions(criteria, ctx.organizationId)
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
}

export async function populateCampaignRecipientRecords(
  ctx: SessionContext,
  data: PopulateCampaignRecipientsInput
): Promise<{ recipientCount: number }> {

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
    const conditions = buildCampaignRecipientConditions(criteria, ctx.organizationId)
    // Get all matching contacts
    const matchingContacts = await db
      .select({
        id: contacts.id,
        email: contacts.email,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        customerId: contacts.customerId,
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
      customerId: contact.customerId,
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
}
