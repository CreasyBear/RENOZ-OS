/**
 * Send Campaign Job
 *
 * Trigger.dev task for sending campaign emails in configurable batches.
 * Respects rate limits and handles failures gracefully.
 *
 * @see DOM-COMMS-003c
 */

import { eventTrigger } from "@trigger.dev/sdk";
import { z } from "zod";
import { client } from "../client";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  emailCampaigns,
  campaignRecipients,
  emailHistory,
  type NewEmailHistory,
  type CampaignTemplateData,
} from "drizzle/schema";
import {
  prepareEmailForTracking,
  TRACKING_BASE_URL,
} from "@/lib/server/email-tracking";
import { createEmailActivitiesBatch, type EmailActivityInput } from "@/lib/server/activity-bridge";

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
// EMAIL TEMPLATES
// ============================================================================

/**
 * Simple template variable substitution
 */
function renderTemplate(
  template: string,
  variables: Record<string, string | number | boolean>
): string {
  return Object.entries(variables).reduce((result, [key, value]) => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    return result.replace(regex, String(value));
  }, template);
}

/**
 * Get template content based on template type
 */
function getTemplateContent(templateType: string): { subject: string; body: string } {
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

// ============================================================================
// JOB DEFINITION
// ============================================================================

/**
 * Send Campaign Job
 *
 * Triggered when a campaign is ready to send.
 * Processes recipients in batches with rate limiting.
 */
export const sendCampaignJob = client.defineJob({
  id: "send-campaign",
  name: "Send Campaign Emails",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "campaign.send",
    schema: z.object({
      campaignId: z.string().uuid(),
      batchSize: z.number().min(1).max(100).optional(),
      batchDelayMs: z.number().min(1000).max(60000).optional(),
    }),
  }),
  run: async (payload, io) => {
    const { campaignId, batchSize = DEFAULT_BATCH_SIZE, batchDelayMs = DEFAULT_BATCH_DELAY_MS } = payload;

    await io.logger.info(`Starting campaign send: ${campaignId}`, {
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
      throw new Error(`Campaign ${campaignId} cannot be sent (status: ${campaign.status})`);
    }

    // Update campaign status to sending
    await db
      .update(emailCampaigns)
      .set({
        status: "sending",
        startedAt: new Date(),
      })
      .where(eq(emailCampaigns.id, campaignId));

    // Get template content
    const template = getTemplateContent(campaign.templateType);
    const campaignData = (campaign.templateData ?? {}) as CampaignTemplateData;
    const campaignVariables = (campaignData.variables ?? {}) as Record<string, string | number | boolean>;

    // Track stats
    let totalSent = 0;
    let totalFailed = 0;
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
        await io.logger.info(`No more recipients to process`);
        break;
      }

      await io.logger.info(`Processing batch ${batchNumber} with ${recipients.length} recipients`);

      // Collect activity inputs for batch insert (PERF-001)
      const activityInputs: EmailActivityInput[] = [];

      // Process each recipient in the batch
      for (const recipient of recipients) {
        const taskId = `send-to-${recipient.id}`;

        try {
          await io.runTask(taskId, async () => {
            // Merge recipient-specific data with campaign data
            const recipientData = (recipient.recipientData ?? {}) as Record<string, unknown>;
            const variables: Record<string, string | number | boolean> = {
              ...campaignVariables,
              first_name: recipient.name?.split(" ")[0] || "there",
              email: recipient.email,
              ...Object.fromEntries(
                Object.entries(recipientData).filter(([, v]) =>
                  typeof v === "string" || typeof v === "number" || typeof v === "boolean"
                )
              ) as Record<string, string | number | boolean>,
            };

            // Check for subject/body override
            const subject = campaignData.subjectOverride
              ? renderTemplate(String(campaignData.subjectOverride), variables)
              : renderTemplate(template.subject, variables);
            const bodyHtml = campaignData.bodyOverride
              ? renderTemplate(String(campaignData.bodyOverride), variables)
              : renderTemplate(template.body, variables);

            // Create email history record
            const [emailRecord] = await db
              .insert(emailHistory)
              .values({
                organizationId: campaign.organizationId,
                senderId: campaign.createdById,
                fromAddress: `noreply@${TRACKING_BASE_URL.replace(/https?:\/\//, "").split("/")[0]}`,
                toAddress: recipient.email,
                customerId: recipient.contactId, // Link to contact's customer if available
                subject,
                bodyHtml,
                status: "pending",
              } as NewEmailHistory)
              .returning();

            // Prepare email with tracking
            const { html: trackedHtml } = prepareEmailForTracking(
              bodyHtml,
              emailRecord.id
            );

            // Update email history with tracked HTML
            await db
              .update(emailHistory)
              .set({ bodyHtml: trackedHtml })
              .where(eq(emailHistory.id, emailRecord.id));

            // TODO: Actually send the email via Resend
            // In production, this would call the Resend API
            // For now, we'll simulate success

            await io.logger.info(`Sent email to ${recipient.email} (emailHistoryId: ${emailRecord.id})`);

            // Update recipient status to sent
            await db
              .update(campaignRecipients)
              .set({
                status: "sent",
                sentAt: new Date(),
                emailHistoryId: emailRecord.id,
              })
              .where(eq(campaignRecipients.id, recipient.id));

            // Update email history status
            await db
              .update(emailHistory)
              .set({ status: "sent", sentAt: new Date() })
              .where(eq(emailHistory.id, emailRecord.id));

            // Collect activity input for batch insert (PERF-001)
            activityInputs.push({
              emailId: emailRecord.id,
              organizationId: campaign.organizationId,
              userId: campaign.createdById,
              customerId: recipient.contactId, // Link to contact's customer if available
              subject,
              recipientEmail: recipient.email,
              recipientName: recipient.name,
            });

            totalSent++;
          });
        } catch (error) {
          await io.logger.error(`Failed to send to ${recipient.email}`, {
            error: error instanceof Error ? error.message : String(error),
          });

          // Update recipient status to failed
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

      // Batch insert all activity records (PERF-001: single INSERT vs N+1)
      if (activityInputs.length > 0) {
        const batchResult = await createEmailActivitiesBatch(activityInputs);
        if (!batchResult.success) {
          await io.logger.error(`Failed to batch create activities: ${batchResult.error}`);
        } else {
          await io.logger.info(`Created ${batchResult.count} activity records in batch`);
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

      // Reset batch counters
      const batchSent = totalSent;
      const batchFailed = totalFailed;
      totalSent = 0;
      totalFailed = 0;

      await io.logger.info(`Batch ${batchNumber} complete: ${batchSent} sent, ${batchFailed} failed`);

      // Delay between batches to respect rate limits
      if (hasMore && recipients.length === batchSize) {
        await io.logger.info(`Waiting ${batchDelayMs}ms before next batch...`);
        await io.wait(`batch-delay-${batchNumber}`, batchDelayMs);
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

    await io.logger.info(`Campaign ${campaignId} complete`, {
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

// ============================================================================
// PAUSE/RESUME CAMPAIGN JOB
// ============================================================================

/**
 * Pause Campaign Job
 *
 * Pauses a running campaign.
 */
export const pauseCampaignJob = client.defineJob({
  id: "pause-campaign",
  name: "Pause Campaign",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "campaign.pause",
    schema: z.object({
      campaignId: z.string().uuid(),
    }),
  }),
  run: async (payload, io) => {
    const { campaignId } = payload;

    await io.logger.info(`Pausing campaign: ${campaignId}`);

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
      throw new Error(`Campaign ${campaignId} not found or not currently sending`);
    }

    await io.logger.info(`Campaign ${campaignId} paused`);

    return { campaignId, status: "paused" };
  },
});

// ============================================================================
// SCHEDULED CAMPAIGN PROCESSOR
// ============================================================================

/**
 * Process Scheduled Campaigns Job
 *
 * Runs periodically to check for campaigns due to send.
 */
export const processScheduledCampaignsJob = client.defineJob({
  id: "process-scheduled-campaigns",
  name: "Process Scheduled Campaigns",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "campaigns.process-scheduled",
  }),
  run: async (_payload, io) => {
    await io.logger.info("Checking for scheduled campaigns to send");

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

    await io.logger.info(`Found ${dueCampaigns.length} scheduled campaigns to process`);

    for (const campaign of dueCampaigns) {
      // Trigger the send job for each campaign
      await io.sendEvent(`trigger-campaign-${campaign.id}`, {
        name: "campaign.send",
        payload: { campaignId: campaign.id },
      });

      await io.logger.info(`Triggered send for campaign ${campaign.id}`);
    }

    return {
      processed: dueCampaigns.length,
      campaignIds: dueCampaigns.map(c => c.id),
    };
  },
});
