/**
 * Quote Send Server Functions
 *
 * Owns quote email send orchestration for Pipeline quotes: quote PDF
 * generation, email history, Resend delivery, activity logging, and stage bump.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { sendQuoteSchema, type SendQuoteResult } from '@/lib/schemas';
import { formatCurrency } from '@/lib/formatters';
import { NotFoundError, ServerError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { pipelineLogger } from '@/lib/logger';
import {
  customers,
  emailHistory,
  opportunities,
  opportunityActivities,
  organizations,
  quoteVersions,
  type NewEmailHistory,
} from 'drizzle/schema';
import { generateQuotePdf } from './quote-pdf';

const resend = new Resend(process.env.RESEND_API_KEY);

const QUOTE_PDF_FAILED_MESSAGE = 'Unable to generate quote PDF. Refresh and try again.';
const QUOTE_ATTACHMENT_FAILED_MESSAGE =
  'Unable to prepare the quote attachment. Refresh and try again.';
const QUOTE_EMAIL_FAILED_MESSAGE =
  'Quote email could not be sent. Check the recipient and email settings, then try again.';
const QUOTE_EMAIL_HISTORY_CREATE_FAILED_MESSAGE =
  'Unable to record quote email history. Refresh and try again.';
const QUOTE_EMAIL_HISTORY_STATUS_FAILED_MESSAGE =
  'Quote email was sent, but email history needs review.';
const QUOTE_EMAIL_HISTORY_AND_FOLLOW_UP_FAILED_MESSAGE =
  'Quote email was sent, but email history and follow-up updates need review.';
const QUOTE_FOLLOW_UP_FAILED_MESSAGE =
  'Quote email was sent, but opportunity follow-up updates need review.';
const QUOTE_FOLLOW_UP_STAGE_FAILED_MESSAGE =
  'Activity history or stage update needs review. Refresh the opportunity before continuing.';

type ResendEmailSendResult = Awaited<ReturnType<typeof resend.emails.send>>;

/**
 * Send a quote to the customer via email.
 * Generates PDF if needed and sends with attachment.
 */
export const sendQuote = createServerFn({ method: 'POST' })
  .inputValidator(sendQuoteSchema)
  .handler(async ({ data }): Promise<SendQuoteResult> => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });

    const {
      opportunityId,
      quoteVersionId,
      recipientEmail,
      recipientName,
      subject,
      message,
      ccEmails,
    } = data;

    const version = await db
      .select({
        id: quoteVersions.id,
        versionNumber: quoteVersions.versionNumber,
        items: quoteVersions.items,
        subtotal: quoteVersions.subtotal,
        taxAmount: quoteVersions.taxAmount,
        total: quoteVersions.total,
        notes: quoteVersions.notes,
      })
      .from(quoteVersions)
      .where(
        and(
          eq(quoteVersions.id, quoteVersionId),
          eq(quoteVersions.opportunityId, opportunityId),
          eq(quoteVersions.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!version[0]) {
      throw new NotFoundError('Quote version not found', 'quoteVersion');
    }

    const quoteVersion = version[0];

    const opportunity = await db
      .select({
        id: opportunities.id,
        title: opportunities.title,
        customerId: opportunities.customerId,
        stage: opportunities.stage,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!opportunity[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    const opp = opportunity[0];

    const customer = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
      })
      .from(customers)
      .where(
        and(
          eq(customers.id, opp.customerId),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .limit(1);

    if (!customer[0]) {
      throw new NotFoundError('Customer not found', 'customer');
    }

    const cust = customer[0];

    const org = await db
      .select({
        name: organizations.name,
        email: organizations.email,
        branding: organizations.branding,
      })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    const organization = org[0];
    const fromEmail = process.env.EMAIL_FROM || 'noreply@resend.dev';
    const fromName = organization?.name || 'Renoz';
    const fromAddress = `${fromName} <${fromEmail}>`;

    const failedStageResult = (error: string, stages: SendQuoteResult['stages']): SendQuoteResult => ({
      quoteVersionId,
      recipientEmail,
      recipientName,
      subject: subject || `Quote for ${opp.title}`,
      message: message || `Please find attached our quote for ${opp.title}.`,
      ccEmails,
      success: false,
      status: 'failed',
      error,
      stages,
    });

    const pdfResult = await generateQuotePdf({ data: { id: quoteVersionId } });

    if (pdfResult.status !== 'completed' || !pdfResult.pdfUrl) {
      return failedStageResult(QUOTE_PDF_FAILED_MESSAGE, {
        pdf: { status: 'failed', message: 'Quote PDF could not be generated.' },
        emailHistory: { status: 'skipped', message: 'Email history was not created.' },
        email: { status: 'skipped', message: 'Email was not attempted.' },
        stageBump: { status: 'skipped', message: 'Opportunity follow-up stages were not attempted.' },
      });
    }

    let pdfBuffer: ArrayBuffer;
    try {
      const pdfResponse = await fetch(pdfResult.pdfUrl);
      if (!pdfResponse.ok) {
        pipelineLogger.warn('Quote PDF attachment download returned a non-OK response', {
          orgId: ctx.organizationId,
          opportunityId,
          quoteVersionId,
          status: pdfResponse.status,
        });

        return failedStageResult(QUOTE_ATTACHMENT_FAILED_MESSAGE, {
          pdf: { status: 'completed', message: 'Quote PDF was generated.' },
          emailHistory: { status: 'skipped', message: 'Email history was not created.' },
          email: { status: 'skipped', message: 'Email was not attempted.' },
          stageBump: { status: 'skipped', message: 'Opportunity follow-up stages were not attempted.' },
        });
      }

      pdfBuffer = await pdfResponse.arrayBuffer();
    } catch (error) {
      pipelineLogger.error('Failed to prepare quote PDF attachment', error, {
        orgId: ctx.organizationId,
        opportunityId,
        quoteVersionId,
      });

      return failedStageResult(QUOTE_ATTACHMENT_FAILED_MESSAGE, {
        pdf: { status: 'completed', message: 'Quote PDF was generated.' },
        emailHistory: { status: 'skipped', message: 'Email history was not created.' },
        email: { status: 'skipped', message: 'Email was not attempted.' },
        stageBump: { status: 'skipped', message: 'Opportunity follow-up stages were not attempted.' },
      });
    }

    const emailSubject = subject || `Quote for ${opp.title}`;
    const emailMessage = message || `Please find attached our quote for ${opp.title}.`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${emailSubject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1a1a1a;">${emailSubject}</h1>
  <p>Hi ${recipientName || cust.name},</p>
  <p>${emailMessage}</p>
  <p>Quote Details:</p>
  <ul>
    <li>Quote Version: ${quoteVersion.versionNumber}</li>
    <li>Subtotal: ${formatCurrency(Number(quoteVersion.subtotal) || 0)}</li>
    <li>GST (10%): ${formatCurrency(Number(quoteVersion.taxAmount) || 0)}</li>
    <li>Total: ${formatCurrency(Number(quoteVersion.total) || 0)}</li>
  </ul>
  <p>Please review the attached PDF and let us know if you have any questions.</p>
  <p>Best regards,<br>${fromName} Team</p>
</body>
</html>`;

    const textContent = `
${emailSubject}

Hi ${recipientName || cust.name},

${emailMessage}

Quote Details:
- Quote Version: ${quoteVersion.versionNumber}
- Subtotal: ${formatCurrency(Number(quoteVersion.subtotal) || 0)}
- GST (10%): ${formatCurrency(Number(quoteVersion.taxAmount) || 0)}
- Total: ${formatCurrency(Number(quoteVersion.total) || 0)}

Please review the attached PDF and let us know if you have any questions.

Best regards,
${fromName} Team
`.trim();

    let emailRecord: { id: string };
    try {
      const [createdEmailRecord] = await db
        .insert(emailHistory)
        .values({
          organizationId: ctx.organizationId,
          fromAddress: fromAddress,
          toAddress: recipientEmail,
          customerId: cust.id,
          subject: emailSubject,
          bodyHtml: htmlContent,
          bodyText: textContent,
          status: 'pending',
        } as NewEmailHistory)
        .returning({ id: emailHistory.id });

      if (!createdEmailRecord) {
        throw new ServerError(
          'Unable to record quote email history',
          500,
          'PIPELINE_QUOTE_EMAIL_HISTORY_CREATE_FAILED'
        );
      }

      emailRecord = createdEmailRecord;
    } catch (error) {
      pipelineLogger.error('Failed to record quote email history', error, {
        orgId: ctx.organizationId,
        opportunityId,
        quoteVersionId,
      });

      return failedStageResult(QUOTE_EMAIL_HISTORY_CREATE_FAILED_MESSAGE, {
        pdf: { status: 'completed', message: 'Quote PDF was generated.' },
        emailHistory: { status: 'failed', message: 'Email history could not be created.' },
        email: { status: 'skipped', message: 'Email was not attempted.' },
        stageBump: { status: 'skipped', message: 'Opportunity follow-up stages were not attempted.' },
      });
    }

    const markEmailHistoryFailed = async (): Promise<SendQuoteResult['stages']['emailHistory']> => {
      try {
        const [updatedEmailRecord] = await db
          .update(emailHistory)
          .set({ status: 'failed' })
          .where(and(eq(emailHistory.id, emailRecord.id), eq(emailHistory.organizationId, ctx.organizationId)))
          .returning({ id: emailHistory.id });

        if (!updatedEmailRecord) {
          throw new ServerError(
            'Unable to mark quote email history failed',
            500,
            'PIPELINE_QUOTE_EMAIL_HISTORY_FAILED_STATUS_MISSING'
          );
        }

        return {
          status: 'completed',
          message: 'Email history recorded the send attempt.',
        };
      } catch (error) {
        pipelineLogger.error('Failed to mark quote email history failed', error, {
          orgId: ctx.organizationId,
          opportunityId,
          quoteVersionId,
          emailHistoryId: emailRecord.id,
        });

        return {
          status: 'failed',
          message: 'Email history status could not be updated after the send failed.',
        };
      }
    };

    let sendResult: ResendEmailSendResult['data'];
    let sendError: ResendEmailSendResult['error'];
    try {
      const resendResult = await resend.emails.send({
        from: fromAddress,
        to: [recipientEmail],
        cc: ccEmails,
        subject: emailSubject,
        html: htmlContent,
        text: textContent,
        attachments: [
          {
            filename: pdfResult.filename,
            content: Buffer.from(pdfBuffer).toString('base64'),
          },
        ],
      });

      sendResult = resendResult.data;
      sendError = resendResult.error;
    } catch (error) {
      pipelineLogger.error('Quote email provider failed before returning a delivery result', error, {
        orgId: ctx.organizationId,
        opportunityId,
        quoteVersionId,
        emailHistoryId: emailRecord.id,
      });

      return failedStageResult(QUOTE_EMAIL_FAILED_MESSAGE, {
        pdf: { status: 'completed', message: 'Quote PDF was generated.' },
        emailHistory: await markEmailHistoryFailed(),
        email: { status: 'failed', message: QUOTE_EMAIL_FAILED_MESSAGE },
        stageBump: { status: 'skipped', message: 'Opportunity follow-up stages were not attempted.' },
      });
    }

    if (sendError) {
      pipelineLogger.error('Failed to send quote email', sendError, {
        orgId: ctx.organizationId,
        opportunityId,
        quoteVersionId,
        emailHistoryId: emailRecord.id,
      });

      return failedStageResult(QUOTE_EMAIL_FAILED_MESSAGE, {
        pdf: { status: 'completed', message: 'Quote PDF was generated.' },
        emailHistory: await markEmailHistoryFailed(),
        email: { status: 'failed', message: QUOTE_EMAIL_FAILED_MESSAGE },
        stageBump: { status: 'skipped', message: 'Opportunity follow-up stages were not attempted.' },
      });
    }

    let sentEmailHistoryStage: SendQuoteResult['stages']['emailHistory'] = {
      status: 'completed',
      message: 'Email history recorded the sent email.',
    };
    let quoteSentWarning: string | undefined;

    try {
      const [updatedEmailRecord] = await db
        .update(emailHistory)
        .set({
          status: 'sent',
          sentAt: new Date(),
          resendMessageId: sendResult?.id,
        })
        .where(and(eq(emailHistory.id, emailRecord.id), eq(emailHistory.organizationId, ctx.organizationId)))
        .returning({ id: emailHistory.id });

      if (!updatedEmailRecord) {
        throw new ServerError(
          'Unable to mark quote email history sent',
          500,
          'PIPELINE_QUOTE_EMAIL_HISTORY_SENT_STATUS_MISSING'
        );
      }
    } catch (error) {
      pipelineLogger.error('Failed to mark quote email history sent', error, {
        orgId: ctx.organizationId,
        opportunityId,
        quoteVersionId,
        emailHistoryId: emailRecord.id,
        resendMessageId: sendResult?.id,
      });

      sentEmailHistoryStage = {
        status: 'failed',
        message: 'Email history status could not be updated after delivery.',
      };
      quoteSentWarning = QUOTE_EMAIL_HISTORY_STATUS_FAILED_MESSAGE;
    }

    let stageBumpStage: SendQuoteResult['stages']['stageBump'] = {
      status: 'skipped',
      message: 'Opportunity stage did not need to change.',
    };

    try {
      await db.transaction(async (tx) => {
        const [createdActivity] = await tx
          .insert(opportunityActivities)
          .values({
            organizationId: ctx.organizationId,
            opportunityId,
            type: 'email',
            description: `Quote V${quoteVersion.versionNumber} sent to ${recipientEmail}`,
            createdBy: ctx.user.id,
          })
          .returning({ id: opportunityActivities.id });

        if (!createdActivity) {
          throw new ServerError(
            'Unable to record quote send activity',
            500,
            'PIPELINE_QUOTE_SEND_ACTIVITY_FAILED'
          );
        }

        if (opp.stage === 'new' || opp.stage === 'qualified') {
          const [updatedOpportunity] = await tx
            .update(opportunities)
            .set({
              stage: 'proposal',
              updatedAt: new Date(),
              version: sql`${opportunities.version} + 1`,
            })
            .where(
              and(
                eq(opportunities.id, opportunityId),
                eq(opportunities.organizationId, ctx.organizationId),
                eq(opportunities.stage, opp.stage)
              )
            )
            .returning({ id: opportunities.id });

          if (!updatedOpportunity) {
            stageBumpStage = {
              status: 'skipped',
              message: 'Opportunity stage changed before the proposal update.',
            };
            return;
          }

          stageBumpStage = {
            status: 'completed',
            message: 'Opportunity advanced to proposal.',
          };
          return;
        }

        stageBumpStage = {
          status: 'skipped',
          message: 'Opportunity stage was already beyond proposal.',
        };
      });
    } catch (error) {
      pipelineLogger.error('Failed to complete quote send follow-up updates', error, {
        orgId: ctx.organizationId,
        opportunityId,
        quoteVersionId,
        emailHistoryId: emailRecord.id,
        resendMessageId: sendResult?.id,
      });

      return {
        quoteVersionId,
        recipientEmail,
        recipientName,
        subject: emailSubject,
        message: emailMessage,
        ccEmails,
        pdfUrl: pdfResult.pdfUrl,
        emailHistoryId: emailRecord.id,
        resendMessageId: sendResult?.id,
        success: true,
        status: 'sent',
        error: quoteSentWarning
          ? QUOTE_EMAIL_HISTORY_AND_FOLLOW_UP_FAILED_MESSAGE
          : QUOTE_FOLLOW_UP_FAILED_MESSAGE,
        stages: {
          pdf: { status: 'completed', message: 'Quote PDF was generated.' },
          emailHistory: sentEmailHistoryStage,
          email: { status: 'completed', message: 'Quote email was sent successfully.' },
          stageBump: {
            status: 'failed',
            message: QUOTE_FOLLOW_UP_STAGE_FAILED_MESSAGE,
          },
        },
      };
    }

    return {
      quoteVersionId,
      recipientEmail,
      recipientName,
      subject: emailSubject,
      message: emailMessage,
      ccEmails,
      pdfUrl: pdfResult.pdfUrl,
      success: true,
      status: 'sent' as const,
      emailHistoryId: emailRecord.id,
      resendMessageId: sendResult?.id,
      ...(quoteSentWarning ? { error: quoteSentWarning } : {}),
      stages: {
        pdf: { status: 'completed', message: 'Quote PDF was generated.' },
        emailHistory: sentEmailHistoryStage,
        email: { status: 'completed', message: 'Quote email was sent successfully.' },
        stageBump: stageBumpStage,
      },
    };
  });
