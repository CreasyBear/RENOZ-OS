import { and, count, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/server/errors';
import { sendCampaignTask, pauseCampaignTask } from '@/trigger/jobs/send-campaign';
import { campaignRecipients, emailCampaigns } from 'drizzle/schema/communications';

type CampaignRecord = typeof emailCampaigns.$inferSelect;

export async function getCampaignForAction(params: {
  campaignId: string;
  organizationId: string;
}): Promise<CampaignRecord> {
  const [campaign] = await db
    .select()
    .from(emailCampaigns)
    .where(
      and(
        eq(emailCampaigns.id, params.campaignId),
        eq(emailCampaigns.organizationId, params.organizationId)
      )
    )
    .limit(1);

  if (!campaign) {
    throw new NotFoundError('Campaign not found', 'campaign');
  }

  return campaign;
}

export function assertCampaignStatus(
  campaign: CampaignRecord,
  allowedStatuses: CampaignRecord['status'][],
  action: string
): void {
  if (!allowedStatuses.includes(campaign.status)) {
    throw new ConflictError(
      `Cannot ${action} campaign with status "${campaign.status}". Allowed statuses: ${allowedStatuses.join(', ')}.`
    );
  }
}

export async function ensureCampaignHasRecipients(campaignId: string): Promise<void> {
  const [recipientCount] = await db
    .select({ count: count() })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId));

  if (Number(recipientCount?.count ?? 0) === 0) {
    throw new ValidationError('Campaign has no recipients. Please add recipients before sending.');
  }
}

export async function cancelCampaignRecord(params: {
  campaignId: string;
  organizationId: string;
}): Promise<CampaignRecord> {
  const [updated] = await db
    .update(emailCampaigns)
    .set({ status: 'cancelled' })
    .where(
      and(
        eq(emailCampaigns.id, params.campaignId),
        eq(emailCampaigns.organizationId, params.organizationId)
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('Campaign not found', 'campaign');
  }

  return updated;
}

export async function triggerCampaignSend(campaignId: string): Promise<void> {
  await sendCampaignTask.trigger({ campaignId });
}

export async function triggerCampaignPause(campaignId: string): Promise<void> {
  await pauseCampaignTask.trigger({ campaignId });
}
