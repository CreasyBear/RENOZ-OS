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
import { client } from "../client";
import {
  getDueScheduledEmails,
  markScheduledEmailAsSent,
} from "@/lib/server/scheduled-emails";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailHistory, type NewEmailHistory } from "drizzle/schema";
import {
  prepareEmailForTracking,
  TRACKING_BASE_URL,
} from "@/lib/server/email-tracking";
import { createEmailSentActivity } from "@/lib/server/activity-bridge";

// ============================================================================
// EMAIL TEMPLATES (simple template rendering)
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
      return { processed: 0, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Process each email
    for (const scheduledEmail of dueEmails) {
      const taskId = `send-email-${scheduledEmail.id}`;

      try {
        await io.runTask(taskId, async () => {
          await io.logger.info(`Processing scheduled email ${scheduledEmail.id}`);

          // Get template content
          const template = getTemplateContent(scheduledEmail.templateType);
          const variables = (scheduledEmail.templateData?.variables || {}) as Record<string, string | number | boolean>;

          // Check for subject/body override
          const templateData = scheduledEmail.templateData || {};
          const subject = templateData.subjectOverride
            ? String(templateData.subjectOverride)
            : renderTemplate(template.subject, variables);
          const bodyHtml = templateData.bodyOverride
            ? String(templateData.bodyOverride)
            : renderTemplate(template.body, variables);

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

          // TODO: Actually send the email via email provider (Resend, SendGrid, etc.)
          // For now, we just log and mark as sent
          // The trackedHtml would be sent as the email body when integrated with a provider
          await io.logger.info(`Would send email to ${scheduledEmail.recipientEmail}`, {
            subject,
            recipientName: scheduledEmail.recipientName,
            bodyLength: trackedHtml.length,
          });

          // Update email history status to sent and store linkMap for validation
          await db
            .update(emailHistory)
            .set({
              status: "sent",
              sentAt: new Date(),
              bodyHtml: trackedHtml, // Save tracked version
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
    };
  },
});
