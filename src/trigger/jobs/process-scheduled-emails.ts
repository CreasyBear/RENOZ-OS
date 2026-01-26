/**
 * Process Scheduled Emails Job
 *
 * Runs every minute to check for and send scheduled emails.
 * Uses a cron trigger to poll the database for due emails.
 *
 * @see DOM-COMMS-002b
 * @see https://trigger.dev/docs/documentation/guides/scheduled-tasks
 */
import { cronTrigger } from "@trigger.dev/sdk";
import { Resend } from "resend";
import { client } from "../client";
import {
  getDueScheduledEmails,
  markScheduledEmailAsSent,
} from "@/lib/server/scheduled-emails";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailHistory, scheduledEmails, type NewEmailHistory } from "drizzle/schema";
import {
  prepareEmailForTracking,
  TRACKING_BASE_URL,
} from "@/lib/server/email-tracking";
import { createEmailSentActivity } from "@/lib/server/activity-bridge";
import { isEmailSuppressedDirect } from "@/server/functions/communications/email-suppression";
import { generateUnsubscribeUrl } from "@/lib/server/unsubscribe-tokens";
import { createHash } from "crypto";
import { substituteTemplateVariables } from "@/lib/email/sanitize";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

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
// EMAIL TEMPLATES
// ============================================================================

/**
 * Get template content based on template type
 * In production, this would load from a templates table
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
    quote: {
      subject: "Your Quote {{quote_number}} is Ready",
      body: `<html><body>
        <p>Hi {{first_name}},</p>
        <p>Your quote {{quote_number}} is ready for review.</p>
        <p><a href="{{quote_url}}">View Your Quote</a></p>
        <p>The quote is valid until {{expiry_date}}.</p>
        <p>Best regards,<br>{{sender_name}}</p>
      </body></html>`,
    },
    order_confirmation: {
      subject: "Order Confirmation - {{order_number}}",
      body: `<html><body>
        <h1>Order Confirmed!</h1>
        <p>Hi {{first_name}},</p>
        <p>Thank you for your order {{order_number}}.</p>
        <p>Order Total: {{order_total}}</p>
        <p>We'll notify you when your order ships.</p>
        <p>Best regards,<br>The {{company_name}} Team</p>
      </body></html>`,
    },
    shipping_notification: {
      subject: "Your Order {{order_number}} Has Shipped!",
      body: `<html><body>
        <h1>Your Order is On Its Way!</h1>
        <p>Hi {{first_name}},</p>
        <p>Great news! Your order {{order_number}} has shipped.</p>
        <p>Tracking Number: {{tracking_number}}</p>
        <p><a href="{{tracking_url}}">Track Your Order</a></p>
        <p>Best regards,<br>The {{company_name}} Team</p>
      </body></html>`,
    },
    reminder: {
      subject: "Reminder: {{reminder_subject}}",
      body: `<html><body>
        <p>Hi {{first_name}},</p>
        <p>This is a friendly reminder about {{reminder_subject}}.</p>
        <p>{{reminder_details}}</p>
        <p>Best regards,<br>{{sender_name}}</p>
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
// SCHEDULED JOB
// ============================================================================

export const processScheduledEmailsJob = client.defineJob({
  id: "process-scheduled-emails",
  name: "Process Scheduled Emails",
  version: "1.0.0",
  trigger: cronTrigger({
    cron: "* * * * *", // Every minute
  }),
  run: async (_payload, io) => {
    await io.logger.info("Checking for scheduled emails to send");

    // Get emails that are due
    const dueEmails = await getDueScheduledEmails(50); // Process up to 50 emails per run

    await io.logger.info(`Found ${dueEmails.length} scheduled emails to process`);

    if (dueEmails.length === 0) {
      return { processed: 0, sent: 0, failed: 0, skipped: 0 };
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0; // INT-RES-004: Track suppressed emails

    // Process each email
    for (const scheduledEmail of dueEmails) {
      const taskId = `send-email-${scheduledEmail.id}`;

      // INT-RES-004: Check if recipient is suppressed before sending
      const suppression = await isEmailSuppressedDirect(
        scheduledEmail.organizationId,
        scheduledEmail.recipientEmail
      );

      if (suppression.suppressed) {
        // INT-RES-004: Log with hashed email for privacy
        await io.logger.info(`Skipping suppressed scheduled email: ${hashEmail(scheduledEmail.recipientEmail)} (reason: ${suppression.reason})`, {
          scheduledEmailId: scheduledEmail.id,
          reason: suppression.reason,
          emailHash: hashEmail(scheduledEmail.recipientEmail),
        });

        // Mark scheduled email as skipped
        await db
          .update(scheduledEmails)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: `Suppressed: ${suppression.reason}`,
            updatedAt: new Date(),
          })
          .where(eq(scheduledEmails.id, scheduledEmail.id));

        skipped++;
        continue;
      }

      try {
        await io.runTask(taskId, async () => {
          await io.logger.info(`Processing scheduled email ${scheduledEmail.id}`);

          // INT-RES-007: Generate secure unsubscribe URL for this recipient
          // Note: scheduledEmails table has customerId, not contactId
          // We use customerId if available, otherwise fall back to email record ID
          const unsubscribeUrl = generateUnsubscribeUrl({
            contactId: scheduledEmail.customerId || scheduledEmail.id,
            email: scheduledEmail.recipientEmail,
            channel: "email",
            organizationId: scheduledEmail.organizationId,
          });

          // Get template content
          const template = getTemplateContent(scheduledEmail.templateType);
          const baseVariables = (scheduledEmail.templateData?.variables || {}) as Record<string, string | number | boolean>;
          // INT-RES-007: Add unsubscribe URL to template variables
          const variables: Record<string, string | number | boolean> = {
            ...baseVariables,
            unsubscribe_url: unsubscribeUrl,
          };

          // Check for subject/body override
          const templateData = scheduledEmail.templateData || {};
          const subject = templateData.subjectOverride
            ? String(templateData.subjectOverride)
            : substituteTemplateVariables(template.subject, variables);
          const bodyHtml = templateData.bodyOverride
            ? String(templateData.bodyOverride)
            : substituteTemplateVariables(template.body, variables);

          // Create email history record
          const [emailRecord] = await db
            .insert(emailHistory)
            .values({
              organizationId: scheduledEmail.organizationId,
              senderId: scheduledEmail.userId,
              fromAddress: `noreply@${TRACKING_BASE_URL.replace(/https?:\/\//, "").split("/")[0]}`,
              toAddress: scheduledEmail.recipientEmail,
              customerId: scheduledEmail.customerId,
              subject,
              bodyHtml,
              status: "pending",
            } as NewEmailHistory)
            .returning();

          // Prepare email with tracking (wrap links, add tracking pixel)
          const { html: trackedHtml, linkMap } = prepareEmailForTracking(
            bodyHtml,
            emailRecord.id,
            { trackOpens: true, trackClicks: true }
          );

          // Convert Map to plain object for JSON storage
          const linkMapObject = Object.fromEntries(linkMap);

          // Get sender email from environment
          const fromEmail = process.env.EMAIL_FROM || "noreply@resend.dev";
          const fromName = process.env.EMAIL_FROM_NAME || "Renoz CRM";
          const fromAddress = `${fromName} <${fromEmail}>`;

          // Convert HTML to plain text for email
          const textContent = trackedHtml
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n\n")
            .replace(/<\/div>/gi, "\n")
            .replace(/<\/li>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

          // Send the email via Resend with List-Unsubscribe headers
          const { data: sendResult, error: sendError } = await resend.emails.send({
            from: fromAddress,
            to: [scheduledEmail.recipientEmail],
            subject,
            html: trackedHtml,
            text: textContent,
            headers: {
              // INT-RES-007: CAN-SPAM compliant unsubscribe headers
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          });

          if (sendError) {
            throw new Error(sendError.message || "Failed to send email via Resend");
          }

          await io.logger.info(`Sent scheduled email (emailHistoryId: ${emailRecord.id}, resendMessageId: ${sendResult?.id})`, {
            subject,
            recipientName: scheduledEmail.recipientName,
          });

          // Update email history status to sent with Resend message ID for webhook correlation
          await db
            .update(emailHistory)
            .set({
              status: "sent",
              sentAt: new Date(),
              bodyHtml: trackedHtml, // Save tracked version
              resendMessageId: sendResult?.id, // Store for webhook correlation
              metadata: {
                linkMap: linkMapObject, // Store linkMap for URL validation
              },
            })
            .where(eq(emailHistory.id, emailRecord.id));

          // Mark scheduled email as sent
          await markScheduledEmailAsSent(scheduledEmail.id, emailRecord.id);

          // Create activity record for the email (COMMS-AUTO-001)
          await createEmailSentActivity({
            emailId: emailRecord.id,
            organizationId: scheduledEmail.organizationId,
            userId: scheduledEmail.userId,
            customerId: scheduledEmail.customerId,
            subject,
            recipientEmail: scheduledEmail.recipientEmail,
            recipientName: scheduledEmail.recipientName,
          });

          return { success: true, emailId: emailRecord.id };
        });

        sent++;
      } catch (error) {
        await io.logger.error(`Failed to send scheduled email ${scheduledEmail.id}`, {
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
