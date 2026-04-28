'use server'

/**
 * Process Scheduled Emails Job (Trigger.dev v3)
 *
 * Runs every minute to check for and send scheduled emails.
 * Uses a scheduled task to poll the database for due emails.
 *
 * @see DOM-COMMS-002b
 * @see https://trigger.dev/docs/v3/tasks
 */
import { schedules, logger } from "@trigger.dev/sdk/v3";
import { Resend } from "resend";
import {
  getDueScheduledEmails,
  markScheduledEmailAsSent,
} from "@/lib/server/scheduled-emails";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  emailHistory,
  scheduledEmails,
  type NewEmailHistory,
} from "drizzle/schema";
import {
  prepareEmailForTracking,
  TRACKING_BASE_URL,
} from "@/lib/server/email-tracking";
import { createEmailSentActivity } from "@/lib/server/activity-bridge";
import { isEmailSuppressedDirect } from "@/server/functions/communications/email-suppression";
import { generateUnsubscribeUrl } from "@/lib/server/unsubscribe-tokens";
import { createHash } from "crypto";
import {
  renderOutboundEmail,
  renderHtmlToText,
  TemplateUnresolvedError,
} from "@/lib/server/outbound-email";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessScheduledEmailsResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
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
// TASK DEFINITION
// ============================================================================

/**
 * Process Scheduled Emails Task
 *
 * Checks for scheduled emails that are due and sends them via Resend.
 */
export const processScheduledEmailsTask = schedules.task({
  id: "process-scheduled-emails",
  cron: "* * * * *",
  run: async (): Promise<ProcessScheduledEmailsResult> => {
    logger.info("Checking for scheduled emails to send");

    // Get emails that are due
    const dueEmails = await getDueScheduledEmails(50); // Process up to 50 emails per run

    logger.info(`Found ${dueEmails.length} scheduled emails to process`);

    if (dueEmails.length === 0) {
      return { processed: 0, sent: 0, failed: 0, skipped: 0 };
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0; // INT-RES-004: Track suppressed emails

    // Process each email
    for (const scheduledEmail of dueEmails) {
      await db
        .update(scheduledEmails)
        .set({
          status: "processing",
          attemptCount: sql`${scheduledEmails.attemptCount} + 1`,
          lastAttemptAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(scheduledEmails.id, scheduledEmail.id));

      // INT-RES-004: Check if recipient is suppressed before sending
      const suppression = await isEmailSuppressedDirect(
        scheduledEmail.organizationId,
        scheduledEmail.recipientEmail
      );

      if (suppression.suppressed) {
        // INT-RES-004: Log with hashed email for privacy
        logger.info(
          `Skipping suppressed scheduled email: ${hashEmail(scheduledEmail.recipientEmail)} (reason: ${suppression.reason})`,
          {
            scheduledEmailId: scheduledEmail.id,
            reason: suppression.reason,
            emailHash: hashEmail(scheduledEmail.recipientEmail),
          }
        );

        // Mark scheduled email as skipped
        await db
          .update(scheduledEmails)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: `Suppressed: ${suppression.reason}`,
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(scheduledEmails.id, scheduledEmail.id));

        skipped++;
        continue;
      }

      try {
        logger.info(`Processing scheduled email ${scheduledEmail.id}`);

        // INT-RES-007: Generate secure unsubscribe URL for this recipient
        const unsubscribeUrl = generateUnsubscribeUrl({
          contactId: scheduledEmail.customerId || scheduledEmail.id,
          email: scheduledEmail.recipientEmail,
          channel: "email",
          organizationId: scheduledEmail.organizationId,
        });

        const rendered = await renderOutboundEmail({
          organizationId: scheduledEmail.organizationId,
          templateType: scheduledEmail.templateType,
          templateData:
            (scheduledEmail.templateData as Record<string, unknown> | null) ?? {},
          subject: scheduledEmail.subject,
          variables: {
            unsubscribe_url: unsubscribeUrl,
          },
          userId: scheduledEmail.userId,
        });

        // Create email history record
        const [emailRecord] = await db
          .insert(emailHistory)
          .values({
            organizationId: scheduledEmail.organizationId,
            senderId: scheduledEmail.userId,
            fromAddress: `noreply@${TRACKING_BASE_URL.replace(/https?:\/\//, "").split("/")[0]}`,
            toAddress: scheduledEmail.recipientEmail,
            customerId: scheduledEmail.customerId,
            subject: rendered.subject,
            bodyHtml: rendered.bodyHtml,
            bodyText: rendered.bodyText,
            status: "pending",
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

        // Prepare email with tracking (wrap links, add tracking pixel)
        const { html: trackedHtml, linkMap } = prepareEmailForTracking(
          rendered.bodyHtml,
          emailRecord.id,
          { trackOpens: rendered.trackOpens, trackClicks: rendered.trackClicks }
        );

        // Convert Map to plain object for JSON storage
        const linkMapObject = Object.fromEntries(linkMap);

        // Get sender email from environment
        const fromEmail = process.env.EMAIL_FROM || "noreply@resend.dev";
        const fromName = process.env.EMAIL_FROM_NAME || "Renoz CRM";
        const fromAddress = `${fromName} <${fromEmail}>`;

        // Convert HTML to plain text for email
        const textContent = renderHtmlToText(trackedHtml);

        // Send the email via Resend with List-Unsubscribe headers
        const { data: sendResult, error: sendError } = await resend.emails.send(
          {
            from: fromAddress,
            to: [scheduledEmail.recipientEmail],
            subject: rendered.subject,
            html: trackedHtml,
            text: textContent,
            ...(rendered.replyTo ? { replyTo: rendered.replyTo } : {}),
            headers: {
              // INT-RES-007: CAN-SPAM compliant unsubscribe headers
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }
        );

        if (sendError) {
          throw new Error(
            sendError.message || "Failed to send email via Resend"
          );
        }

        logger.info(
          `Sent scheduled email (emailHistoryId: ${emailRecord.id}, resendMessageId: ${sendResult?.id})`,
          {
            subject: rendered.subject,
            recipientName: scheduledEmail.recipientName,
          }
        );

        // Update email history status to sent with Resend message ID for webhook correlation
        await db
          .update(emailHistory)
          .set({
            status: "sent",
            sentAt: new Date(),
            bodyHtml: trackedHtml, // Save tracked version
            resendMessageId: sendResult?.id, // Store for webhook correlation
            metadata: {
              previewText: rendered.previewText ?? undefined,
              priority: rendered.priority ?? undefined,
              replyTo: rendered.replyTo ?? undefined,
              templateId: rendered.templateId ?? undefined,
              templateVersion: rendered.templateVersion ?? undefined,
              linkMap: linkMapObject, // Store linkMap for URL validation
            },
          })
          .where(eq(emailHistory.id, emailRecord.id));

        // Mark scheduled email as sent
        await markScheduledEmailAsSent(
          scheduledEmail.id,
          emailRecord.id,
          scheduledEmail.organizationId
        );

        // Create activity record for the email (COMMS-AUTO-001)
        await createEmailSentActivity({
          emailId: emailRecord.id,
          organizationId: scheduledEmail.organizationId,
          userId: scheduledEmail.userId,
          customerId: scheduledEmail.customerId,
          subject: rendered.subject,
          recipientEmail: scheduledEmail.recipientEmail,
          recipientName: scheduledEmail.recipientName,
        });

        sent++;
      } catch (error) {
        if (error instanceof TemplateUnresolvedError) {
          const templateData = ((scheduledEmail.templateData as Record<string, unknown> | null) ?? {});
          await db
            .update(scheduledEmails)
            .set({
              status: "failed",
              templateData: {
                ...templateData,
                validationError: error.message,
              },
              lastError: error.message,
              updatedAt: new Date(),
            })
            .where(eq(scheduledEmails.id, scheduledEmail.id));
        } else {
          await db
            .update(scheduledEmails)
            .set({
              status: "failed",
              lastError: error instanceof Error ? error.message : String(error),
              updatedAt: new Date(),
            })
            .where(eq(scheduledEmails.id, scheduledEmail.id));
        }
        logger.error(`Failed to send scheduled email ${scheduledEmail.id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        failed++;
      }
    }

    return {
      processed: dueEmails.length,
      sent,
      failed,
      skipped, // INT-RES-004: Include suppressed count
    };
  },
});


// Legacy export for backward compatibility
export const processScheduledEmailsJob = processScheduledEmailsTask;
