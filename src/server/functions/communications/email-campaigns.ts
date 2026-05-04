/**
 * Email Campaigns Server Functions
 *
 * Facades only: auth + validation + delegation to campaign helpers.
 */
import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  cancelCampaignSchema,
  createCampaignSchema,
  deleteCampaignSchema,
  duplicateCampaignSchema,
  getCampaignByIdSchema,
  getCampaignRecipientsSchema,
  getCampaignsSchema,
  pauseCampaignSchema,
  populateCampaignRecipientsSchema,
  previewRecipientsSchema,
  resumeCampaignSchema,
  sendCampaignSchema,
  testSendCampaignSchema,
  updateCampaignSchema,
} from '@/lib/schemas/communications';
import { createCampaignRecord, deleteCampaignRecord, duplicateCampaignRecord, updateCampaignRecord } from './_shared/campaign-write';
import { readCampaignById, readCampaigns } from './_shared/campaign-read';
import { populateCampaignRecipientRecords, previewCampaignRecipientSelection, readCampaignRecipients } from './_shared/campaign-recipient-read';
import { sendCampaignTestEmail } from './_shared/campaign-test-send';
import { assertCampaignStatus, cancelCampaignRecord as cancelCampaignActionRecord, ensureCampaignHasRecipients, getCampaignForAction, triggerCampaignPause, triggerCampaignSend } from './_shared/campaign-actions';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';

export const createCampaign = createServerFn({ method: 'POST' })
  .inputValidator(createCampaignSchema)
  .handler(async ({ data }) => createCampaignRecord(await withAuth({ permission: PERMISSIONS.email.create }), data));

export const updateCampaign = createServerFn({ method: 'POST' })
  .inputValidator(updateCampaignSchema)
  .handler(async ({ data }) => updateCampaignRecord(await withAuth({ permission: PERMISSIONS.email.update }), data));

export const getCampaigns = createServerFn({ method: 'GET' })
  .inputValidator(getCampaignsSchema)
  .handler(async ({ data }) => readCampaigns(await withAuth({ permission: PERMISSIONS.email.read }), data));

export const getCampaignById = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getCampaignByIdSchema))
  .handler(async ({ data }) => readCampaignById(await withAuth({ permission: PERMISSIONS.email.read }), data));

export const getCampaignRecipients = createServerFn({ method: 'GET' })
  .inputValidator(getCampaignRecipientsSchema)
  .handler(async ({ data }) => readCampaignRecipients(await withAuth({ permission: PERMISSIONS.email.read }), data));

export const previewCampaignRecipients = createServerFn({ method: 'POST' })
  .inputValidator(previewRecipientsSchema)
  .handler(async ({ data }) => previewCampaignRecipientSelection(await withAuth({ permission: PERMISSIONS.email.read }), data));

export const populateCampaignRecipients = createServerFn({ method: 'POST' })
  .inputValidator(populateCampaignRecipientsSchema)
  .handler(async ({ data }) => populateCampaignRecipientRecords(await withAuth({ permission: PERMISSIONS.email.update }), data));

export const cancelCampaign = createServerFn({ method: 'POST' })
  .inputValidator(cancelCampaignSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.email.update });
    const campaign = await getCampaignForAction({ campaignId: data.id, organizationId: ctx.organizationId });
    assertCampaignStatus(campaign, ['draft', 'scheduled', 'sending', 'paused'], 'cancel');
    const updated = await cancelCampaignActionRecord({ campaignId: data.id, organizationId: ctx.organizationId });
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'email',
      entityId: updated.id,
      action: 'updated',
      description: `Cancelled email campaign: ${updated.name}`,
      metadata: { campaignName: updated.name, previousStatus: campaign.status, newStatus: updated.status },
    });
    return updated;
  });

export const deleteCampaign = createServerFn({ method: 'POST' })
  .inputValidator(deleteCampaignSchema)
  .handler(async ({ data }) => deleteCampaignRecord(await withAuth({ permission: PERMISSIONS.email.delete }), data));

export const sendCampaign = createServerFn({ method: 'POST' })
  .inputValidator(sendCampaignSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.email.update });
    const campaign = await getCampaignForAction({ campaignId: data.id, organizationId: ctx.organizationId });
    assertCampaignStatus(campaign, ['draft', 'scheduled', 'paused'], 'send');
    await ensureCampaignHasRecipients(data.id);
    await triggerCampaignSend(data.id);
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'email',
      entityId: campaign.id,
      action: 'updated',
      description: `Started sending email campaign: ${campaign.name}`,
      metadata: { campaignName: campaign.name, previousStatus: campaign.status, newStatus: 'sending' },
    });
    return { success: true, campaignId: data.id };
  });

export const pauseCampaign = createServerFn({ method: 'POST' })
  .inputValidator(pauseCampaignSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.email.update });
    const campaign = await getCampaignForAction({ campaignId: data.id, organizationId: ctx.organizationId });
    assertCampaignStatus(campaign, ['sending'], 'pause');
    await triggerCampaignPause(data.id);
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'email',
      entityId: campaign.id,
      action: 'updated',
      description: `Paused email campaign: ${campaign.name}`,
      metadata: { campaignName: campaign.name, previousStatus: campaign.status, newStatus: 'paused' },
    });
    return { success: true, campaignId: data.id };
  });

export const resumeCampaign = createServerFn({ method: 'POST' })
  .inputValidator(resumeCampaignSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.email.update });
    const campaign = await getCampaignForAction({ campaignId: data.id, organizationId: ctx.organizationId });
    assertCampaignStatus(campaign, ['paused'], 'resume');
    await triggerCampaignSend(data.id);
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'email',
      entityId: campaign.id,
      action: 'updated',
      description: `Resumed email campaign: ${campaign.name}`,
      metadata: { campaignName: campaign.name, previousStatus: campaign.status, newStatus: 'sending' },
    });
    return { success: true, campaignId: data.id };
  });

export const duplicateCampaign = createServerFn({ method: 'POST' })
  .inputValidator(duplicateCampaignSchema)
  .handler(async ({ data }) => duplicateCampaignRecord(await withAuth({ permission: PERMISSIONS.email.create }), data));

export const testSendCampaign = createServerFn({ method: 'POST' })
  .inputValidator(testSendCampaignSchema)
  .handler(async ({ data }) => sendCampaignTestEmail(await withAuth({ permission: PERMISSIONS.email.create }), data));
