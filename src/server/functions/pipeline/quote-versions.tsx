/**
 * Quote Versions Server Functions
 *
 * API for quote creation, versioning, and sending.
 * All monetary values in AUD dollars (numeric(12,2)). GST is 10%.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-QUOTE-BUILDER-API)
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import {
  customers,
  emailHistory,
  opportunities,
  opportunityActivities,
  organizations,
  quoteVersions,
  type NewEmailHistory,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  createQuoteVersionSchema,
  quoteVersionFilterSchema,
  quoteVersionParamsSchema,
  restoreQuoteVersionSchema,
  sendQuoteSchema,
  type QuoteLineItem,
  type SendQuoteResult,
} from '@/lib/schemas';
import { GST_RATE } from '@/lib/order-calculations';
import { formatCurrency } from '@/lib/formatters';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { generateQuotePdf } from './quote-pdf';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate line item total from quantity and unit price, applying discount
 * Returns total in dollars
 */
function calculateLineItemTotal(item: QuoteLineItem): number {
  const subtotal = item.quantity * item.unitPrice;
  const discount = item.discountPercent ? subtotal * (item.discountPercent / 100) : 0;
  return Math.round((subtotal - discount) * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate quote totals from line items
 * @returns { subtotal, taxAmount, total } all in dollars
 */
function calculateQuoteTotals(items: QuoteLineItem[]): {
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  // Recalculate each line item total to ensure consistency
  const processedItems = items.map((item) => ({
    ...item,
    total: calculateLineItemTotal(item),
  }));

  const subtotal = processedItems.reduce((sum, item) => sum + (item.total ?? 0), 0);
  const taxAmount = Math.round(subtotal * GST_RATE * 100) / 100; // Round to 2 decimal places
  const total = Math.round((subtotal + taxAmount) * 100) / 100; // Round to 2 decimal places

  return { subtotal, taxAmount, total };
}

// ============================================================================
// CREATE QUOTE VERSION
// ============================================================================

/**
 * Create a new quote version for an opportunity.
 * Automatically calculates subtotal, GST (10%), and total.
 * Each save creates a new immutable version.
 */
export const createQuoteVersion = createServerFn({ method: 'POST' })
  .inputValidator(createQuoteVersionSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });

    const { opportunityId, items, notes } = data;

    // Verify opportunity exists and belongs to org
    const opportunity = await db
      .select()
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

    // Calculate totals
    const { subtotal, taxAmount, total } = calculateQuoteTotals(items);

    // Process line items to ensure total is correct
    const processedItems = items.map((item) => ({
      ...item,
      total: calculateLineItemTotal(item),
    }));

    // Wrap quote creation and opportunity update in transaction for atomicity.
    // Version number generation is inside the transaction to prevent race conditions
    // where two concurrent creates could get the same version number.
    const quoteVersion = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Get next version number inside transaction to prevent race condition
      const latest = await tx
        .select({ versionNumber: quoteVersions.versionNumber })
        .from(quoteVersions)
        .where(eq(quoteVersions.opportunityId, opportunityId))
        .orderBy(desc(quoteVersions.versionNumber))
        .limit(1);

      const versionNumber = (latest[0]?.versionNumber ?? 0) + 1;

      // Create quote version
      const [newVersion] = await tx
        .insert(quoteVersions)
        .values({
          organizationId: ctx.organizationId,
          opportunityId,
          versionNumber,
          items: processedItems,
          subtotal,
          taxAmount,
          total,
          notes: notes ?? null,
          createdBy: ctx.user.id,
        })
        .returning();

      // Update opportunity value to match latest quote total
      await tx
        .update(opportunities)
        .set({
          value: total,
          weightedValue: Math.round(total * ((opportunity[0].probability ?? 50) / 100)),
          updatedBy: ctx.user.id,
        })
        .where(eq(opportunities.id, opportunityId));

      return newVersion;
    });

    return { quoteVersion };
  });

// ============================================================================
// GET QUOTE VERSION
// ============================================================================

/**
 * Get a single quote version by ID
 */
export const getQuoteVersion = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(quoteVersionParamsSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { id } = data;

    const version = await db
      .select()
      .from(quoteVersions)
      .where(and(eq(quoteVersions.id, id), eq(quoteVersions.organizationId, ctx.organizationId)))
      .limit(1);

    if (!version[0]) {
      throw new NotFoundError('Quote version not found', 'quoteVersion');
    }

    return { quoteVersion: version[0] };
  });

// ============================================================================
// LIST QUOTE VERSIONS (History)
// ============================================================================

/**
 * Get all quote versions for an opportunity (version history)
 * Returns in descending order (newest first)
 */
export const listQuoteVersions = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(quoteVersionFilterSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { opportunityId } = data;

    // Verify opportunity belongs to org
    const opportunity = await db
      .select()
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

    // Get all versions
    const versions = await db
      .select()
      .from(quoteVersions)
      .where(eq(quoteVersions.opportunityId, opportunityId))
      .orderBy(desc(quoteVersions.versionNumber));

    return {
      versions,
      totalCount: versions.length,
      latestVersion: versions[0] ?? null,
    };
  });

// ============================================================================
// RESTORE QUOTE VERSION
// ============================================================================

/**
 * Restore a previous quote version by creating a new version with that content.
 * This maintains the audit trail - versions are never modified.
 * All operations are wrapped in a transaction to prevent race conditions.
 */
export const restoreQuoteVersion = createServerFn({ method: 'POST' })
  .inputValidator(restoreQuoteVersionSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });

    const { opportunityId, sourceVersionId, notes } = data;

    // Wrap all operations in a transaction for atomicity
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Get the source version
      const sourceVersion = await tx
        .select()
        .from(quoteVersions)
        .where(
          and(
            eq(quoteVersions.id, sourceVersionId),
            eq(quoteVersions.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!sourceVersion[0]) {
        throw new NotFoundError('Source quote version not found', 'quoteVersion');
      }

      // Verify it belongs to the same opportunity
      if (sourceVersion[0].opportunityId !== opportunityId) {
        throw new ValidationError('Source version does not belong to this opportunity');
      }

      // Get opportunity for probability calculation
      const opportunity = await tx
        .select()
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

      // Get next version number (query within transaction)
      const latest = await tx
        .select({ versionNumber: quoteVersions.versionNumber })
        .from(quoteVersions)
        .where(eq(quoteVersions.opportunityId, opportunityId))
        .orderBy(desc(quoteVersions.versionNumber))
        .limit(1);

      const versionNumber = (latest[0]?.versionNumber ?? 0) + 1;

      // Create new version with source content
      const restorationNotes = notes
        ? `Restored from v${sourceVersion[0].versionNumber}. ${notes}`
        : `Restored from v${sourceVersion[0].versionNumber}`;

      const [newVersion] = await tx
        .insert(quoteVersions)
        .values({
          organizationId: ctx.organizationId,
          opportunityId,
          versionNumber,
          items: sourceVersion[0].items,
          subtotal: sourceVersion[0].subtotal,
          taxAmount: sourceVersion[0].taxAmount,
          total: sourceVersion[0].total,
          notes: restorationNotes,
          createdBy: ctx.user.id,
        })
        .returning();

      // Update opportunity value to match restored quote
      await tx
        .update(opportunities)
        .set({
          value: sourceVersion[0].total,
          weightedValue: Math.round(
            sourceVersion[0].total * ((opportunity[0].probability ?? 50) / 100)
          ),
          updatedBy: ctx.user.id,
        })
        .where(eq(opportunities.id, opportunityId));

      return {
        quoteVersion: newVersion,
        restoredFrom: sourceVersion[0].versionNumber,
      };
    });

    return result;
  });

// ============================================================================
// SEND QUOTE
// ============================================================================

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Verify quote version exists and belongs to opportunity
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

    // Get opportunity with customer details
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

    // Get customer details
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

    // Get organization details for sender
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
      return failedStageResult('Failed to generate quote PDF', {
        pdf: { status: 'failed', message: 'Quote PDF could not be generated.' },
        emailHistory: { status: 'skipped', message: 'Email history was not created.' },
        email: { status: 'skipped', message: 'Email was not attempted.' },
        stageBump: { status: 'skipped', message: 'Opportunity follow-up stages were not attempted.' },
      });
    }

    // Download PDF from storage to get buffer
    const pdfResponse = await fetch(pdfResult.pdfUrl);
    if (!pdfResponse.ok) {
      return failedStageResult('Failed to download quote PDF for attachment', {
        pdf: { status: 'completed', message: 'Quote PDF was generated.' },
        emailHistory: { status: 'skipped', message: 'Email history was not created.' },
        email: { status: 'skipped', message: 'Email was not attempted.' },
        stageBump: { status: 'skipped', message: 'Opportunity follow-up stages were not attempted.' },
      });
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Build email content
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

    // Create email history record
    const [emailRecord] = await db
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
      .returning();

    // Send email via Resend with attachment
    const { data: sendResult, error: sendError } = await resend.emails.send({
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

    if (sendError) {
      // Update email history with failure
      await db
        .update(emailHistory)
        .set({ status: 'failed' })
        .where(eq(emailHistory.id, emailRecord.id));

      return failedStageResult(`Failed to send email: ${sendError.message}`, {
        pdf: { status: 'completed', message: 'Quote PDF was generated.' },
        emailHistory: { status: 'completed', message: 'Email history recorded the send attempt.' },
        email: { status: 'failed', message: sendError.message },
        stageBump: { status: 'skipped', message: 'Opportunity follow-up stages were not attempted.' },
      });
    }

    await db
      .update(emailHistory)
      .set({
        status: 'sent',
        sentAt: new Date(),
        resendMessageId: sendResult?.id,
      })
      .where(eq(emailHistory.id, emailRecord.id));

    let stageBumpStage: SendQuoteResult['stages']['stageBump'] = {
      status: 'skipped',
      message: 'Opportunity stage did not need to change.',
    };

    try {
      await db.transaction(async (tx) => {
        await tx.insert(opportunityActivities).values({
          organizationId: ctx.organizationId,
          opportunityId,
          type: 'email',
          description: `Quote V${quoteVersion.versionNumber} sent to ${recipientEmail}`,
          createdBy: ctx.user.id,
        });

        if (opp.stage === 'new' || opp.stage === 'qualified') {
          await tx
            .update(opportunities)
            .set({
              stage: 'proposal',
              updatedAt: new Date(),
              version: sql`${opportunities.version} + 1`,
            })
            .where(
              and(
                eq(opportunities.id, opportunityId),
                eq(opportunities.stage, opp.stage)
              )
            );

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
        error: error instanceof Error ? error.message : 'Quote email sent, but follow-up updates failed.',
        stages: {
          pdf: { status: 'completed', message: 'Quote PDF was generated.' },
          emailHistory: { status: 'completed', message: 'Email history recorded the sent email.' },
          email: { status: 'completed', message: 'Quote email was sent successfully.' },
          stageBump: {
            status: 'failed',
            message: error instanceof Error ? error.message : 'Activity or stage follow-up failed.',
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
      stages: {
        pdf: { status: 'completed', message: 'Quote PDF was generated.' },
        emailHistory: { status: 'completed', message: 'Email history recorded the sent email.' },
        email: { status: 'completed', message: 'Quote email was sent successfully.' },
        stageBump: stageBumpStage,
      },
    };
  });
