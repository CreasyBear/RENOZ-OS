'use server'

/**
 * Send Campaign Job (Trigger.dev v3)
 *
 * Tasks for sending campaign emails in configurable batches.
 * Respects rate limits and handles failures gracefully.
 *
 * @see DOM-COMMS-003c
 * @see https://trigger.dev/docs/v3/tasks
 */

import { task, schedules, logger, wait } from "@trigger.dev/sdk/v3";
import { Resend } from "resend";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  emailCampaigns,
  campaignRecipients,
  emailHistory,
  type NewEmailHistory,
} from "drizzle/schema";
import {
  prepareEmailForTracking,
  TRACKING_BASE_URL,
} from "@/lib/server/email-tracking";
import {
  createEmailActivitiesBatch,
  type EmailActivityInput,
} from "@/lib/server/activity-bridge";
import { checkSuppressionBatchDirect } from "@/server/functions/communications/email-suppression";
import { generateUnsubscribeUrl } from "@/lib/server/unsubscribe-tokens";
import { createHash } from "crypto";
import { renderOutboundEmail, renderHtmlToText } from "@/lib/server/outbound-email";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// PRIVACY HELPERS (INT-RES-004)
// ============================================================================

/**
 * Hash an email address for privacy-safe logging.
 * Returns first 8 chars of SHA-256 hash.
 */
function hashEmail(email: string): string {
  return createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex")
    .slice(0, 8);
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default batch size for sending emails
 * Resend free tier: 100/day, 3/second
 * Resend Pro: Higher limits
 */
const DEFAULT_BATCH_SIZE = 10;

/**
 * Default delay between batches in milliseconds
 * This helps respect rate limits
 */
const DEFAULT_BATCH_DELAY_MS = 5000; // 5 seconds between batches

// ============================================================================
// TASK DEFINITIONS
// ============================================================================

/**
 * Send Campaign Task
 *
 * Triggered when a campaign is ready to send.
 * Processes recipients in batches with rate limiting.
 */
export const sendCampaignTask = task({
  id: "send-campaign",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: SendCampaignPayload): Promise<SendCampaignResult> => {
    const {
      campaignId,
      batchSize = DEFAULT_BATCH_SIZE,
      batchDelayMs = DEFAULT_BATCH_DELAY_MS,
    } = payload;

    logger.info(`Starting campaign send: ${campaignId}`, {
      batchSize,
      batchDelayMs,
    });

    // Get campaign details
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
        `Campaign ${campaignId} cannot be sent (status: ${campaign.status})`
      );
    }

    // Update campaign status to sending
    await db
      .update(emailCampaigns)
      .set({
        status: "sending",
        startedAt: new Date(),
      })
      .where(eq(emailCampaigns.id, campaignId));

    const campaignTemplateData =
      (campaign.templateData as Record<string, unknown> | null) ?? {};

    // Track stats
    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0; // INT-RES-004: Track suppressed emails
    let batchNumber = 0;

    // Process recipients in batches
    let hasMore = true;

    while (hasMore) {
      batchNumber++;

      // Get next batch of pending recipients
      const recipients = await db
        .select()
        .from(campaignRecipients)
        .where(
          and(
            eq(campaignRecipients.campaignId, campaignId),
            eq(campaignRecipients.status, "pending")
          )
        )
        .limit(batchSize);

      if (recipients.length === 0) {
        hasMore = false;
        logger.info(`No more recipients to process`);
        break;
      }

      logger.info(
        `Processing batch ${batchNumber} with ${recipients.length} recipients`
      );

      // INT-RES-004: Check suppression list for all recipients in batch
      const suppressionResults = await checkSuppressionBatchDirect(
        campaign.organizationId,
        recipients.map((r) => r.email)
      );

      // Create a suppression lookup map
      const suppressionMap = new Map(
        suppressionResults.map((r) => [r.email.toLowerCase(), r])
      );

      // Collect activity inputs for batch insert (PERF-001)
      const activityInputs: EmailActivityInput[] = [];

      // Process each recipient in the batch
      for (const recipient of recipients) {
        // INT-RES-004: Check if recipient is suppressed
        const suppression = suppressionMap.get(recipient.email.toLowerCase());
        if (suppression?.suppressed) {
          // INT-RES-004: Log with hashed email for privacy
          logger.info(
            `Skipping suppressed email: ${hashEmail(recipient.email)} (reason: ${suppression.reason})`,
            {
              recipientId: recipient.id,
              reason: suppression.reason,
              emailHash: hashEmail(recipient.email),
            }
          );

          // Mark recipient as skipped
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
          // INT-RES-007: Generate secure unsubscribe URL for this recipient
          const unsubscribeUrl = generateUnsubscribeUrl({
            contactId: recipient.contactId || recipient.id, // Use contactId if available
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

          // Create email history record
          const [emailRecord] = await db
            .insert(emailHistory)
            .values({
              organizationId: campaign.organizationId,
              senderId: campaign.createdById,
              fromAddress: `noreply@${TRACKING_BASE_URL.replace(/https?:\/\//, "").split("/")[0]}`,
              toAddress: recipient.email,
              customerId: recipient.contactId, // Link to contact's customer if available
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

          // Prepare email with tracking
          const { html: trackedHtml, linkMap } = prepareEmailForTracking(
            rendered.bodyHtml,
            emailRecord.id,
            { trackOpens: rendered.trackOpens, trackClicks: rendered.trackClicks }
          );
          const linkMapObject = Object.fromEntries(linkMap);

          // Update email history with tracked HTML
          await db
            .update(emailHistory)
            .set({ bodyHtml: trackedHtml })
            .where(eq(emailHistory.id, emailRecord.id));

          // Get sender email from environment
          const fromEmail = process.env.EMAIL_FROM || "noreply@resend.dev";
          const fromName = process.env.EMAIL_FROM_NAME || "Renoz CRM";
          const fromAddress = `${fromName} <${fromEmail}>`;

          // Send the email via Resend with List-Unsubscribe headers
          const { data: sendResult, error: sendError } =
            await resend.emails.send({
              from: fromAddress,
              to: [recipient.email],
              subject: rendered.subject,
              html: trackedHtml,
              text: renderHtmlToText(trackedHtml),
              ...(rendered.replyTo ? { replyTo: rendered.replyTo } : {}),
              headers: {
                // INT-RES-007: CAN-SPAM compliant unsubscribe headers
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            });

          if (sendError) {
            throw new Error(
              sendError.message || "Failed to send email via Resend"
            );
          }

          logger.info(
            `Sent email to recipient (emailHistoryId: ${emailRecord.id}, resendMessageId: ${sendResult?.id})`
          );

          // Update recipient status to sent
          await db
            .update(campaignRecipients)
            .set({
              status: "sent",
              sentAt: new Date(),
              emailHistoryId: emailRecord.id,
            })
            .where(eq(campaignRecipients.id, recipient.id));

          // Update email history status with Resend message ID for webhook correlation
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

          // Collect activity input for batch insert (PERF-001)
          activityInputs.push({
            emailId: emailRecord.id,
            organizationId: campaign.organizationId,
            userId: campaign.createdById,
            customerId: recipient.contactId, // Link to contact's customer if available
            subject: rendered.subject,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
          });

          totalSent++;
        } catch (error) {
          logger.error(`Failed to send to ${recipient.email}`, {
            error: error instanceof Error ? error.message : String(error),
          });

          // Update recipient status to failed
          await db
            .update(campaignRecipients)
            .set({
              status: "failed",
              failedAt: new Date(),
              errorMessage:
                error instanceof Error ? error.message : "Unknown error",
            })
            .where(eq(campaignRecipients.id, recipient.id));

          totalFailed++;
        }
      }

      // Batch insert all activity records (PERF-001: single INSERT vs N+1)
      if (activityInputs.length > 0) {
        const batchResult = await createEmailActivitiesBatch(activityInputs);
        if (!batchResult.success) {
          logger.error(
            `Failed to batch create activities: ${batchResult.error}`
          );
        } else {
          logger.info(`Created ${batchResult.count} activity records in batch`);
        }
      }

      // Update campaign stats after each batch
      await db
        .update(emailCampaigns)
        .set({
          sentCount: sql`sent_count + ${totalSent}`,
          failedCount: sql`failed_count + ${totalFailed}`,
        })
        .where(eq(emailCampaigns.id, campaignId));

      // Log batch stats (INT-RES-004: include skipped count)
      const batchSent = totalSent;
      const batchFailed = totalFailed;
      const batchSkipped = totalSkipped;
      totalSent = 0;
      totalFailed = 0;
      totalSkipped = 0;

      logger.info(
        `Batch ${batchNumber} complete: ${batchSent} sent, ${batchFailed} failed, ${batchSkipped} skipped (suppressed)`
      );

      // Delay between batches to respect rate limits
      if (hasMore && recipients.length === batchSize) {
        logger.info(`Waiting ${batchDelayMs}ms before next batch...`);
        await wait.for({ seconds: batchDelayMs / 1000 });
      }
    }

    // Get final stats
    const [finalCampaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, campaignId))
      .limit(1);

    // Update campaign status to sent
    await db
      .update(emailCampaigns)
      .set({
        status: "sent",
        completedAt: new Date(),
      })
      .where(eq(emailCampaigns.id, campaignId));

    logger.info(`Campaign ${campaignId} complete`, {
      totalSent: finalCampaign?.sentCount ?? 0,
      totalFailed: finalCampaign?.failedCount ?? 0,
      batches: batchNumber,
    });

    return {
      campaignId,
      status: "sent",
      stats: {
        sent: finalCampaign?.sentCount ?? 0,
        failed: finalCampaign?.failedCount ?? 0,
        batches: batchNumber,
      },
    };
  },
});

/**
 * Pause Campaign Task
 *
 * Pauses a running campaign.
 */
export const pauseCampaignTask = task({
  id: "pause-campaign",
  run: async (
    payload: PauseCampaignPayload
  ): Promise<{ campaignId: string; status: string }> => {
    const { campaignId } = payload;

    logger.info(`Pausing campaign: ${campaignId}`);

    const [updated] = await db
      .update(emailCampaigns)
      .set({ status: "paused" })
      .where(
        and(
          eq(emailCampaigns.id, campaignId),
          eq(emailCampaigns.status, "sending")
        )
      )
      .returning();

    if (!updated) {
      throw new Error(
        `Campaign ${campaignId} not found or not currently sending`
      );
    }

    logger.info(`Campaign ${campaignId} paused`);

    return { campaignId, status: "paused" };
  },
});

/**
 * Process Scheduled Campaigns Task
 *
 * Runs periodically to check for campaigns due to send.
 */
export const processScheduledCampaignsTask = schedules.task({
  id: "process-scheduled-campaigns",
  cron: "*/5 * * * *",
  run: async (): Promise<{ processed: number; campaignIds: string[] }> => {
    logger.info("Checking for scheduled campaigns to send");

    // Find campaigns that are scheduled and due
    const dueCampaigns = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.status, "scheduled"),
          sql`${emailCampaigns.scheduledAt} <= NOW()`
        )
      )
      .limit(10); // Process up to 10 campaigns per run

    logger.info(`Found ${dueCampaigns.length} scheduled campaigns to process`);

    for (const campaign of dueCampaigns) {
      // Trigger the send task for each campaign
      await sendCampaignTask.trigger({ campaignId: campaign.id });
      logger.info(`Triggered send for campaign ${campaign.id}`);
    }

    return {
      processed: dueCampaigns.length,
      campaignIds: dueCampaigns.map((c) => c.id),
    };
  },
});


// Legacy exports for backward compatibility
export const sendCampaignJob = sendCampaignTask;
export const pauseCampaignJob = pauseCampaignTask;
export const processScheduledCampaignsJob = processScheduledCampaignsTask;
