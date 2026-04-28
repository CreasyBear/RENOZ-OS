'use server';

import { createHash } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/lib/db";
import {
  campaignRecipients,
  contacts,
  emailCampaigns,
  emailHistory,
  type NewEmailHistory,
} from "drizzle/schema";
import {
  createEmailActivitiesBatch,
  type EmailActivityInput,
} from "@/lib/server/activity-bridge";
import {
  prepareEmailForTracking,
  TRACKING_BASE_URL,
} from "@/lib/server/email-tracking";
import { renderHtmlToText, renderOutboundEmail } from "@/lib/server/outbound-email";
import { generateUnsubscribeUrl } from "@/lib/server/unsubscribe-tokens";
import { checkSuppressionBatchDirect } from "./suppression-read";

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_BATCH_DELAY_MS = 5000;

const defaultResend = new Resend(process.env.RESEND_API_KEY);

export interface SendCampaignPayload {
  campaignId: string;
  batchSize?: number;
  batchDelayMs?: number;
}

export interface PauseCampaignPayload {
  campaignId: string;
}

export interface SendCampaignResult {
  campaignId: string;
  status: string;
  stats: {
    sent: number;
    failed: number;
    batches: number;
  };
}

interface CampaignJobLogger {
  info(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

interface CampaignSendDependencies {
  logger: CampaignJobLogger;
  waitForSeconds?: (seconds: number) => Promise<unknown>;
  resendClient?: Resend;
}

function hashEmail(email: string): string {
  return createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex")
    .slice(0, 8);
}

export async function processCampaignSend(
  payload: SendCampaignPayload,
  dependencies: CampaignSendDependencies,
): Promise<SendCampaignResult> {
  const resend = dependencies.resendClient ?? defaultResend;
  const { logger, waitForSeconds } = dependencies;
  const {
    campaignId,
    batchSize = DEFAULT_BATCH_SIZE,
    batchDelayMs = DEFAULT_BATCH_DELAY_MS,
  } = payload;

  logger.info(`Starting campaign send: ${campaignId}`, {
    batchSize,
    batchDelayMs,
  });

  const [campaign] = await db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  if (!["scheduled", "draft", "paused"].includes(campaign.status)) {
    throw new Error(
      `Campaign ${campaignId} cannot be sent (status: ${campaign.status})`,
    );
  }

  await db
    .update(emailCampaigns)
    .set({
      status: "sending",
      startedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));

  const campaignTemplateData =
    (campaign.templateData as Record<string, unknown> | null) ?? {};

  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let batchNumber = 0;
  let hasMore = true;

  while (hasMore) {
    batchNumber++;

    const recipients = await db
      .select({
        id: campaignRecipients.id,
        organizationId: campaignRecipients.organizationId,
        campaignId: campaignRecipients.campaignId,
        contactId: campaignRecipients.contactId,
        customerId: campaignRecipients.customerId,
        email: campaignRecipients.email,
        name: campaignRecipients.name,
        recipientData: campaignRecipients.recipientData,
        contactCustomerId: contacts.customerId,
      })
      .from(campaignRecipients)
      .leftJoin(contacts, eq(campaignRecipients.contactId, contacts.id))
      .where(
        and(
          eq(campaignRecipients.campaignId, campaignId),
          eq(campaignRecipients.status, "pending"),
        ),
      )
      .limit(batchSize);

    if (recipients.length === 0) {
      hasMore = false;
      logger.info("No more recipients to process");
      break;
    }

    logger.info(
      `Processing batch ${batchNumber} with ${recipients.length} recipients`,
    );

    const suppressionResults = await checkSuppressionBatchDirect(
      campaign.organizationId,
      recipients.map((recipient) => recipient.email),
    );
    const suppressionMap = new Map(
      suppressionResults.map((result) => [result.email.toLowerCase(), result]),
    );
    const activityInputs: EmailActivityInput[] = [];

    for (const recipient of recipients) {
      const suppression = suppressionMap.get(recipient.email.toLowerCase());
      if (suppression?.suppressed) {
        logger.info(
          `Skipping suppressed email: ${hashEmail(recipient.email)} (reason: ${suppression.reason})`,
          {
            recipientId: recipient.id,
            reason: suppression.reason,
            emailHash: hashEmail(recipient.email),
          },
        );

        await db
          .update(campaignRecipients)
          .set({
            status: "skipped",
            errorMessage: `Suppressed: ${suppression.reason}`,
          })
          .where(eq(campaignRecipients.id, recipient.id));

        totalSkipped++;
        continue;
      }

      try {
        const recipientCustomerId = recipient.customerId ?? recipient.contactCustomerId;
        const unsubscribeUrl = generateUnsubscribeUrl({
          contactId: recipient.contactId || recipientCustomerId || recipient.id,
          email: recipient.email,
          channel: "email",
          organizationId: campaign.organizationId,
        });

        const recipientData = (recipient.recipientData ?? {}) as Record<string, unknown>;
        const rendered = await renderOutboundEmail({
          organizationId: campaign.organizationId,
          templateType: campaign.templateType,
          templateData: campaignTemplateData,
          subject:
            typeof campaignTemplateData.subjectOverride === "string"
              ? campaignTemplateData.subjectOverride
              : null,
          variables: {
            first_name: recipient.name?.split(" ")[0] || "there",
            email: recipient.email,
            unsubscribe_url: unsubscribeUrl,
            ...recipientData,
          },
          userId: campaign.createdById,
        });

        const [emailRecord] = await db
          .insert(emailHistory)
          .values({
            organizationId: campaign.organizationId,
            senderId: campaign.createdById,
            fromAddress: `noreply@${TRACKING_BASE_URL.replace(/https?:\/\//, "").split("/")[0]}`,
            toAddress: recipient.email,
            customerId: recipientCustomerId,
            subject: rendered.subject,
            bodyHtml: rendered.bodyHtml,
            bodyText: rendered.bodyText,
            status: "pending",
            campaignId: campaign.id,
            templateId: rendered.templateId,
            metadata: {
              previewText: rendered.previewText ?? undefined,
              priority: rendered.priority ?? undefined,
              replyTo: rendered.replyTo ?? undefined,
              templateId: rendered.templateId ?? undefined,
              templateVersion: rendered.templateVersion ?? undefined,
            },
          } as NewEmailHistory)
          .returning();

        const { html: trackedHtml, linkMap } = prepareEmailForTracking(
          rendered.bodyHtml,
          emailRecord.id,
          { trackOpens: rendered.trackOpens, trackClicks: rendered.trackClicks },
        );
        const linkMapObject = Object.fromEntries(linkMap);

        await db
          .update(emailHistory)
          .set({ bodyHtml: trackedHtml })
          .where(eq(emailHistory.id, emailRecord.id));

        const fromEmail = process.env.EMAIL_FROM || "noreply@resend.dev";
        const fromName = process.env.EMAIL_FROM_NAME || "Renoz CRM";
        const fromAddress = `${fromName} <${fromEmail}>`;

        const { data: sendResult, error: sendError } =
          await resend.emails.send({
            from: fromAddress,
            to: [recipient.email],
            subject: rendered.subject,
            html: trackedHtml,
            text: renderHtmlToText(trackedHtml),
            ...(rendered.replyTo ? { replyTo: rendered.replyTo } : {}),
            headers: {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });

        if (sendError) {
          throw new Error(sendError.message || "Failed to send email via Resend");
        }

        logger.info(
          `Sent email to recipient (emailHistoryId: ${emailRecord.id}, resendMessageId: ${sendResult?.id})`,
        );

        await db
          .update(campaignRecipients)
          .set({
            status: "sent",
            sentAt: new Date(),
            emailHistoryId: emailRecord.id,
          })
          .where(eq(campaignRecipients.id, recipient.id));

        await db
          .update(emailHistory)
          .set({
            status: "sent",
            sentAt: new Date(),
            resendMessageId: sendResult?.id,
            metadata: {
              previewText: rendered.previewText ?? undefined,
              priority: rendered.priority ?? undefined,
              replyTo: rendered.replyTo ?? undefined,
              templateId: rendered.templateId ?? undefined,
              templateVersion: rendered.templateVersion ?? undefined,
              linkMap: linkMapObject,
            },
          })
          .where(eq(emailHistory.id, emailRecord.id));

        activityInputs.push({
          emailId: emailRecord.id,
          organizationId: campaign.organizationId,
          userId: campaign.createdById,
          customerId: recipientCustomerId,
          subject: rendered.subject,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
        });

        totalSent++;
      } catch (error) {
        logger.error(`Failed to send to ${recipient.email}`, {
          error: error instanceof Error ? error.message : String(error),
        });

        await db
          .update(campaignRecipients)
          .set({
            status: "failed",
            failedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          })
          .where(eq(campaignRecipients.id, recipient.id));

        totalFailed++;
      }
    }

    if (activityInputs.length > 0) {
      const batchResult = await createEmailActivitiesBatch(activityInputs);
      if (!batchResult.success) {
        logger.error(`Failed to batch create activities: ${batchResult.error}`);
      } else {
        logger.info(`Created ${batchResult.count} activity records in batch`);
      }
    }

    await db
      .update(emailCampaigns)
      .set({
        sentCount: sql`sent_count + ${totalSent}`,
        failedCount: sql`failed_count + ${totalFailed}`,
      })
      .where(eq(emailCampaigns.id, campaignId));

    const batchSent = totalSent;
    const batchFailed = totalFailed;
    const batchSkipped = totalSkipped;
    totalSent = 0;
    totalFailed = 0;
    totalSkipped = 0;

    logger.info(
      `Batch ${batchNumber} complete: ${batchSent} sent, ${batchFailed} failed, ${batchSkipped} skipped (suppressed)`,
    );

    if (hasMore && recipients.length === batchSize && waitForSeconds) {
      logger.info(`Waiting ${batchDelayMs}ms before next batch...`);
      await waitForSeconds(batchDelayMs / 1000);
    }
  }

  const [finalCampaign] = await db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1);

  const finalSentCount = finalCampaign?.sentCount ?? 0;
  const finalFailedCount = finalCampaign?.failedCount ?? 0;
  const finalStatus = finalSentCount === 0 && finalFailedCount > 0 ? "failed" : "sent";

  await db
    .update(emailCampaigns)
    .set({
      status: finalStatus,
      completedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));

  logger.info(`Campaign ${campaignId} complete`, {
    totalSent: finalSentCount,
    totalFailed: finalFailedCount,
    batches: batchNumber,
  });

  return {
    campaignId,
    status: finalStatus,
    stats: {
      sent: finalSentCount,
      failed: finalFailedCount,
      batches: batchNumber,
    },
  };
}

export async function pauseCampaignSend(
  payload: PauseCampaignPayload,
  logger: CampaignJobLogger,
): Promise<{ campaignId: string; status: string }> {
  const { campaignId } = payload;

  logger.info(`Pausing campaign: ${campaignId}`);

  const [updated] = await db
    .update(emailCampaigns)
    .set({ status: "paused" })
    .where(
      and(
        eq(emailCampaigns.id, campaignId),
        eq(emailCampaigns.status, "sending"),
      ),
    )
    .returning();

  if (!updated) {
    throw new Error(`Campaign ${campaignId} not found or not currently sending`);
  }

  logger.info(`Campaign ${campaignId} paused`);

  return { campaignId, status: "paused" };
}

export async function processDueScheduledCampaigns(params: {
  logger: CampaignJobLogger;
  triggerSendCampaign: (payload: SendCampaignPayload) => Promise<unknown>;
}): Promise<{ processed: number; campaignIds: string[] }> {
  params.logger.info("Checking for scheduled campaigns to send");

  const dueCampaigns = await db
    .select()
    .from(emailCampaigns)
    .where(
      and(
        eq(emailCampaigns.status, "scheduled"),
        sql`${emailCampaigns.scheduledAt} <= NOW()`,
      ),
    )
    .limit(10);

  params.logger.info(`Found ${dueCampaigns.length} scheduled campaigns to process`);

  for (const campaign of dueCampaigns) {
    await params.triggerSendCampaign({ campaignId: campaign.id });
    params.logger.info(`Triggered send for campaign ${campaign.id}`);
  }

  return {
    processed: dueCampaigns.length,
    campaignIds: dueCampaigns.map((campaign) => campaign.id),
  };
}
