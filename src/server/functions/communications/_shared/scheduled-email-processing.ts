/**
 * Scheduled email processing helper.
 *
 * Pipeline:
 * pending due rows -> claim processing -> render/send -> finalize sent | failed | skipped
 */

import { createHash } from 'crypto';
import { Resend } from 'resend';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  emailHistory,
  scheduledEmails,
  type NewEmailHistory,
} from 'drizzle/schema';
import {
  prepareEmailForTracking,
  TRACKING_BASE_URL,
} from '@/lib/server/email-tracking';
import { createEmailSentActivity } from '@/lib/server/activity-bridge';
import { generateUnsubscribeUrl } from '@/lib/server/unsubscribe-tokens';
import {
  renderHtmlToText,
  renderOutboundEmail,
  TemplateUnresolvedError,
} from '@/lib/server/outbound-email';
import { isEmailSuppressedDirect } from './suppression-read';
import { getDueScheduledEmails } from './scheduled-email-read';
import { markScheduledEmailAsSent } from './scheduled-email-mutations';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface ProcessScheduledEmailsResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}

interface ScheduledEmailJobLogger {
  info(message: string, payload?: Record<string, unknown>): void;
  error(message: string, payload?: Record<string, unknown>): void;
}

function hashEmail(email: string): string {
  return createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex')
    .slice(0, 8);
}

async function claimScheduledEmail(id: string, organizationId: string) {
  const [claimed] = await db
    .update(scheduledEmails)
    .set({
      status: 'processing',
      attemptCount: sql`${scheduledEmails.attemptCount} + 1`,
      lastAttemptAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(scheduledEmails.id, id),
        eq(scheduledEmails.organizationId, organizationId),
        eq(scheduledEmails.status, 'pending'),
      ),
    )
    .returning();

  return claimed ?? null;
}

async function finalizeSkippedScheduledEmail(params: {
  scheduledEmailId: string;
  organizationId: string;
  reason: string;
}) {
  await db
    .update(scheduledEmails)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: params.reason,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(scheduledEmails.id, params.scheduledEmailId),
        eq(scheduledEmails.organizationId, params.organizationId),
        eq(scheduledEmails.status, 'processing'),
      ),
    );
}

async function finalizeFailedScheduledEmail(params: {
  scheduledEmailId: string;
  organizationId: string;
  error: unknown;
}) {
  const message =
    params.error instanceof Error ? params.error.message : String(params.error);
  const templateData =
    params.error instanceof TemplateUnresolvedError
      ? sql`jsonb_set(COALESCE(${scheduledEmails.templateData}, '{}'::jsonb), '{validationError}', to_jsonb(${message}::text), true)`
      : undefined;

  await db
    .update(scheduledEmails)
    .set({
      status: 'failed',
      ...(templateData ? { templateData } : {}),
      lastError: message,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(scheduledEmails.id, params.scheduledEmailId),
        eq(scheduledEmails.organizationId, params.organizationId),
        eq(scheduledEmails.status, 'processing'),
      ),
    );
}

export async function processDueScheduledEmails(params: {
  logger: ScheduledEmailJobLogger;
  limit?: number;
}): Promise<ProcessScheduledEmailsResult> {
  const { logger, limit = 50 } = params;

  logger.info('Checking for scheduled emails to send');
  const dueEmails = await getDueScheduledEmails(limit);
  logger.info(`Found ${dueEmails.length} scheduled emails to process`);

  if (dueEmails.length === 0) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const dueEmail of dueEmails) {
    const scheduledEmail = await claimScheduledEmail(
      dueEmail.id,
      dueEmail.organizationId,
    );
    if (!scheduledEmail) {
      skipped++;
      continue;
    }

    processed++;

    try {
      const suppression = await isEmailSuppressedDirect(
        scheduledEmail.organizationId,
        scheduledEmail.recipientEmail,
      );

      if (suppression.suppressed) {
        logger.info(
          `Skipping suppressed scheduled email: ${hashEmail(scheduledEmail.recipientEmail)} (reason: ${suppression.reason})`,
          {
            scheduledEmailId: scheduledEmail.id,
            reason: suppression.reason,
            emailHash: hashEmail(scheduledEmail.recipientEmail),
          },
        );

        await finalizeSkippedScheduledEmail({
          scheduledEmailId: scheduledEmail.id,
          organizationId: scheduledEmail.organizationId,
          reason: `Suppressed: ${suppression.reason}`,
        });
        skipped++;
        continue;
      }

      logger.info(`Processing scheduled email ${scheduledEmail.id}`);

      const unsubscribeUrl = generateUnsubscribeUrl({
        contactId: scheduledEmail.customerId || scheduledEmail.id,
        email: scheduledEmail.recipientEmail,
        channel: 'email',
        organizationId: scheduledEmail.organizationId,
      });

      const rendered = await renderOutboundEmail({
        organizationId: scheduledEmail.organizationId,
        templateType: scheduledEmail.templateType,
        templateData:
          (scheduledEmail.templateData as Record<string, unknown> | null) ?? {},
        subject: scheduledEmail.subject,
        variables: { unsubscribe_url: unsubscribeUrl },
        userId: scheduledEmail.userId,
      });

      const [emailRecord] = await db
        .insert(emailHistory)
        .values({
          organizationId: scheduledEmail.organizationId,
          senderId: scheduledEmail.userId,
          fromAddress: `noreply@${TRACKING_BASE_URL.replace(/https?:\/\//, '').split('/')[0]}`,
          toAddress: scheduledEmail.recipientEmail,
          customerId: scheduledEmail.customerId,
          subject: rendered.subject,
          bodyHtml: rendered.bodyHtml,
          bodyText: rendered.bodyText,
          status: 'pending',
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
        {
          trackOpens: rendered.trackOpens,
          trackClicks: rendered.trackClicks,
        },
      );
      const linkMapObject = Object.fromEntries(linkMap);
      const fromEmail = process.env.EMAIL_FROM || 'noreply@resend.dev';
      const fromName = process.env.EMAIL_FROM_NAME || 'Renoz CRM';
      const textContent = renderHtmlToText(trackedHtml);

      const { data: sendResult, error: sendError } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [scheduledEmail.recipientEmail],
        subject: rendered.subject,
        html: trackedHtml,
        text: textContent,
        ...(rendered.replyTo ? { replyTo: rendered.replyTo } : {}),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });

      if (sendError) {
        throw new Error(sendError.message || 'Failed to send email via Resend');
      }

      await db
        .update(emailHistory)
        .set({
          status: 'sent',
          sentAt: new Date(),
          bodyHtml: trackedHtml,
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

      await markScheduledEmailAsSent({
        scheduledEmailId: scheduledEmail.id,
        emailHistoryId: emailRecord.id,
        organizationId: scheduledEmail.organizationId,
      });

      await createEmailSentActivity({
        emailId: emailRecord.id,
        organizationId: scheduledEmail.organizationId,
        userId: scheduledEmail.userId,
        customerId: scheduledEmail.customerId,
        subject: rendered.subject,
        recipientEmail: scheduledEmail.recipientEmail,
        recipientName: scheduledEmail.recipientName,
      });

      logger.info(
        `Sent scheduled email (emailHistoryId: ${emailRecord.id}, resendMessageId: ${sendResult?.id})`,
        {
          subject: rendered.subject,
          recipientName: scheduledEmail.recipientName,
        },
      );
      sent++;
    } catch (error) {
      await finalizeFailedScheduledEmail({
        scheduledEmailId: scheduledEmail.id,
        organizationId: scheduledEmail.organizationId,
        error,
      });
      logger.error(`Failed to send scheduled email ${scheduledEmail.id}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      failed++;
    }
  }

  return { processed, sent, failed, skipped };
}
