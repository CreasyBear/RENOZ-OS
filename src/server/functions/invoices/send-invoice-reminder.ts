'use server';

/**
 * Send Invoice Reminder Server Function
 *
 * Sends a payment reminder email to the customer and updates
 * the invoice's reminder timestamp.
 *
 * SECURITY: Uses withAuth for authentication and filters by
 * organizationId for multi-tenant isolation.
 *
 * @source invoice from orders table
 * @source customer from customers table
 * @mutates orders.invoiceReminderSentAt
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, customers, organizations, emailHistory, type NewEmailHistory } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { getAppUrl } from '@/lib/server/app-url';
import { idParamSchema } from '@/lib/schemas/_shared/patterns';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { Invoice } from '@/lib/email/templates/orders';
import type { InvoiceStatus } from '@/lib/constants/invoice-status';

// ============================================================================
// TYPES
// ============================================================================

export interface SendInvoiceReminderResponse {
  success: boolean;
  invoiceId: string;
  emailSent: boolean;
  messageId: string | null;
}

// ============================================================================
// SERVER FUNCTION
// ============================================================================

/**
 * Send a payment reminder email for an invoice
 */
export const sendInvoiceReminder = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }): Promise<SendInvoiceReminderResponse> => {
    const ctx = await withAuth();
    const { organizationId } = ctx;
    const userId = ctx.user.id;

    const { id: invoiceId } = data;

    // Get invoice details with customer joined (optimize: single query)
    // SECURITY: Join customers with organizationId filter for multi-tenant isolation
    const [invoiceWithCustomer] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        invoiceNumber: orders.invoiceNumber,
        invoiceStatus: orders.invoiceStatus,
        invoiceDueDate: orders.invoiceDueDate,
        customerId: orders.customerId,
        subtotal: orders.subtotal,
        taxAmount: orders.taxAmount,
        total: orders.total,
        paidAmount: orders.paidAmount,
        balanceDue: orders.balanceDue,
        orderDate: orders.orderDate,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(orders)
      .innerJoin(
        customers,
        and(
          eq(orders.customerId, customers.id),
          eq(customers.organizationId, organizationId), // SECURITY: Multi-tenant isolation
          isNull(customers.deletedAt)
        )
      )
      .where(
        and(
          eq(orders.id, invoiceId),
          eq(orders.organizationId, organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!invoiceWithCustomer) {
      throw new NotFoundError('Invoice not found');
    }

    const status: InvoiceStatus = invoiceWithCustomer.invoiceStatus ?? 'draft';

    // Only allow reminders for unpaid/overdue invoices
    if (status !== 'unpaid' && status !== 'overdue') {
      throw new ValidationError('Can only send reminders for unpaid or overdue invoices');
    }

    if (!invoiceWithCustomer.customerEmail) {
      throw new ValidationError('Customer has no email address');
    }

    // Get organization details
    const [org] = await db
      .select({
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    const orgName = org?.name || 'Renoz';

    // Generate email content
    const invoiceUrl = `${getAppUrl()}/invoices/${invoiceId}`;
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@renoz.energy';
    const fromEmail = process.env.EMAIL_FROM || 'noreply@resend.dev';
    const fromName = process.env.EMAIL_FROM_NAME || orgName;
    const fromAddress = `${fromName} <${fromEmail}>`;

    // Render the invoice email template
    const emailHtml = await render(
      Invoice({
        customerName: invoiceWithCustomer.customerName,
        invoiceNumber: invoiceWithCustomer.invoiceNumber || invoiceWithCustomer.orderNumber,
        invoiceDate: invoiceWithCustomer.orderDate,
        dueDate: invoiceWithCustomer.invoiceDueDate ? new Date(invoiceWithCustomer.invoiceDueDate) : null,
        subtotal: Number(invoiceWithCustomer.subtotal || 0),
        tax: Number(invoiceWithCustomer.taxAmount || 0),
        total: Number(invoiceWithCustomer.total || 0),
        amountPaid: Number(invoiceWithCustomer.paidAmount || 0),
        balanceDue: Number(invoiceWithCustomer.balanceDue || 0),
        invoiceUrl,
        supportEmail,
        fromCompanyName: orgName,
      })
    );

    // Create email history record first (before external API call)
    const subject = `Payment Reminder: Invoice ${invoiceWithCustomer.invoiceNumber || invoiceWithCustomer.orderNumber}`;
    const [emailRecord] = await db
      .insert(emailHistory)
      .values({
        organizationId,
        fromAddress,
        toAddress: invoiceWithCustomer.customerEmail,
        customerId: invoiceWithCustomer.customerId,
        subject,
        bodyHtml: emailHtml,
        bodyText: `Payment reminder for invoice ${invoiceWithCustomer.invoiceNumber || invoiceWithCustomer.orderNumber}. Balance due: $${Number(invoiceWithCustomer.balanceDue || 0).toFixed(2)}`,
        status: 'pending',
      } as NewEmailHistory)
      .returning();

    // Send email via Resend (external API - cannot be rolled back)
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: [invoiceWithCustomer.customerEmail],
      subject,
      html: emailHtml,
    });

    // Update email history and invoice in transaction
    // If order update fails, email history still reflects send attempt
    const result = await db.transaction(async (tx) => {
      if (sendError) {
        // Update email history with failure
        await tx
          .update(emailHistory)
          .set({ status: 'failed' })
          .where(eq(emailHistory.id, emailRecord.id));
        throw new Error(`Failed to send reminder email: ${sendError.message}`);
      }

      // Update email history with success
      await tx
        .update(emailHistory)
        .set({
          status: 'sent',
          sentAt: new Date(),
          resendMessageId: sendResult?.id,
        })
        .where(eq(emailHistory.id, emailRecord.id));

      // Update invoice reminder timestamp
      const [updated] = await tx
        .update(orders)
        .set({
          invoiceReminderSentAt: new Date(),
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(
          and(
            eq(orders.id, invoiceId),
            eq(orders.organizationId, organizationId),
            isNull(orders.deletedAt)
          )
        )
        .returning({ id: orders.id });

      if (!updated) {
        throw new NotFoundError('Invoice not found or update failed');
      }

      return { emailRecord, sendResult };
    });

    // Log activity
    const logger = createActivityLoggerWithContext(ctx);
    await logger.log({
      entityType: 'order',
      entityId: invoiceId,
      action: 'updated',
      changes: {
        before: { invoiceReminderSentAt: null },
        after: { invoiceReminderSentAt: new Date().toISOString() },
        fields: ['invoiceReminderSentAt'],
      },
      metadata: {
        reason: 'Payment reminder sent',
        emailId: result.emailRecord.id,
        recipientEmail: invoiceWithCustomer.customerEmail,
      },
    });

    return {
      success: true,
      invoiceId,
      emailSent: true,
      messageId: result.sendResult?.id || null,
    };
  });
