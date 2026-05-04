import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import { ConflictError, NotFoundError } from '@/lib/server/errors';
import { computeChanges } from '@/lib/activity-logger';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { emailCampaigns, type CampaignRecipientCriteria, type CampaignTemplateData, type CampaignTemplateType } from 'drizzle/schema/communications';
import type { CreateCampaignInput, DeleteCampaignInput, DuplicateCampaignInput, UpdateCampaignInput } from '@/lib/schemas/communications';

const CAMPAIGN_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'createdAt',
  'organizationId',
];

export async function createCampaignRecord(
  ctx: SessionContext,
  data: CreateCampaignInput
): Promise<typeof emailCampaigns.$inferSelect> {
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
}

export async function updateCampaignRecord(
  ctx: SessionContext,
  data: UpdateCampaignInput
): Promise<typeof emailCampaigns.$inferSelect> {
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
}

export async function deleteCampaignRecord(
  ctx: SessionContext,
  data: DeleteCampaignInput
): Promise<{ success: true }> {

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
}

export async function duplicateCampaignRecord(
  ctx: SessionContext,
  data: DuplicateCampaignInput
): Promise<typeof emailCampaigns.$inferSelect> {
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
}
