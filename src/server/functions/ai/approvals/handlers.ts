'use server'

/**
 * AI Approval Action Handlers
 *
 * Registry of handlers for approved AI actions.
 * Each handler executes the drafted action within a transaction.
 * Uses Zod validation for runtime type safety on action data.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { Resend } from 'resend';
import { orders, quotes, customers, organizations, emailHistory, type NewEmailHistory } from 'drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { aiEmailDraftSchema } from '@/lib/ai/approvals/email-draft';
import { db } from '@/lib/db';
import type {
  HandlerContext,
  HandlerPostCommitEffect,
  HandlerResult,
  ActionHandler,
} from '@/lib/ai/approvals/types';
import { getEmailFrom, getEmailFromName, getResendApiKey } from '@/lib/email/config';
import { createEmailSentActivity } from '@/lib/server/activity-bridge';
import { generateOrderNumber } from '@/server/functions/orders/orders';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/** Schema for order draft data */
const orderDraftSchema = z.object({
  customerId: z.string().uuid(),
  orderDate: z.string().or(z.date()).optional(),
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().or(z.string()),
  })).optional(),
});

/** Schema for quote draft data */
const quoteDraftSchema = z.object({
  customerId: z.string().uuid(),
  validUntil: z.string().or(z.date()).optional(),
  notes: z.string().optional(),
});

const emailSentStatuses = new Set([
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'complained',
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainTextToHtml(body: string): string {
  const escapedBody = escapeHtml(body).replace(/\n/g, '<br />');
  return `<html><body><div>${escapedBody}</div></body></html>`;
}

/** Schema for delete action data */
const deleteActionSchema = z.object({
  entityType: z.enum(['customer', 'order', 'quote']),
  entityId: z.string().uuid(),
});

/** Schema for update customer notes data */
const updateNotesSchema = z.object({
  customerId: z.string().uuid(),
  notes: z.string().optional(),
  customFields: z.object({
    internalNotes: z.string().optional(),
  }).optional(),
});

// Re-export types from types.ts
export type { HandlerContext, HandlerResult, ActionHandler } from '@/lib/ai/approvals/types';

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Create order handler.
 * Inserts a new order from the drafted data.
 */
async function createOrderHandler(
  actionData: Record<string, unknown>,
  context: HandlerContext
): Promise<HandlerResult> {
  try {
    // Validate draft data with Zod
    const parseResult = orderDraftSchema.safeParse(actionData.draft);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid order draft: ${parseResult.error.issues.map(i => i.message).join(', ')}`,
      };
    }

    const draft = parseResult.data;
    const orderNumber = await generateOrderNumber(context.organizationId);

    const [order] = await context.tx
      .insert(orders)
      .values({
        customerId: draft.customerId,
        orderNumber,
        orderDate: draft.orderDate ? new Date(draft.orderDate).toISOString().slice(0, 10) : undefined,
        internalNotes: draft.notes ?? null,
        organizationId: context.organizationId,
        createdBy: context.userId,
        status: 'draft',
      })
      .returning({ id: orders.id });

    return {
      success: true,
      data: { orderId: order.id },
      entityId: order.id,
      entityType: 'order',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order',
    };
  }
}

/**
 * Create quote handler.
 * Inserts a new quote from the drafted data.
 */
async function createQuoteHandler(
  actionData: Record<string, unknown>,
  context: HandlerContext
): Promise<HandlerResult> {
  try {
    // Validate draft data with Zod
    const parseResult = quoteDraftSchema.safeParse(actionData.draft);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid quote draft: ${parseResult.error.issues.map(i => i.message).join(', ')}`,
      };
    }

    const draft = parseResult.data;

    const [quote] = await context.tx
      .insert(quotes)
      .values({
        customerId: draft.customerId,
        validUntil: draft.validUntil ? new Date(draft.validUntil) : undefined,
        notes: draft.notes,
        organizationId: context.organizationId,
        createdBy: context.userId,
        status: 'draft',
      } as typeof quotes.$inferInsert)
      .returning({ id: quotes.id });

    return {
      success: true,
      data: { quoteId: quote.id },
      entityId: quote.id,
      entityType: 'quote',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create quote',
    };
  }
}

/**
 * Send email handler.
 * Email sending is not yet wired into the AI approval execution path.
 */
async function sendEmailHandler(
  actionData: Record<string, unknown>,
  context: HandlerContext
): Promise<HandlerResult> {
  try {
    const parseResult = aiEmailDraftSchema.safeParse(actionData.draft);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid email draft: ${parseResult.error.issues.map(i => i.message).join(', ')}`,
      };
    }

    const draft = parseResult.data;
    const [customer] = await context.tx
      .select({
        id: customers.id,
        name: customers.name,
        organizationId: customers.organizationId,
      })
      .from(customers)
      .where(
        and(
          eq(customers.id, draft.customerId),
          eq(customers.organizationId, context.organizationId),
          sql`${customers.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found for this email draft',
      };
    }

    const [organization] = await context.tx
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, context.organizationId))
      .limit(1);

    const [existingEmail] = await context.tx
      .select({
        id: emailHistory.id,
        status: emailHistory.status,
        resendMessageId: emailHistory.resendMessageId,
        toAddress: emailHistory.toAddress,
        subject: emailHistory.subject,
      })
      .from(emailHistory)
      .where(
        and(
          eq(emailHistory.organizationId, context.organizationId),
          sql`${emailHistory.metadata}->>'aiApprovalId' = ${context.approvalId}`
        )
      )
      .limit(1);

    if (
      existingEmail &&
      (emailSentStatuses.has(existingEmail.status) || existingEmail.resendMessageId)
    ) {
      return {
        success: true,
        data: {
          emailHistoryId: existingEmail.id,
          messageId: existingEmail.resendMessageId,
          customerId: customer.id,
          recipientEmail: existingEmail.toAddress,
          subject: existingEmail.subject,
        },
        entityId: existingEmail.id,
        entityType: 'email',
      };
    }

    const fromEmail = getEmailFrom();
    const fromName = getEmailFromName();
    const fromAddress = `${fromName} <${fromEmail}>`;
    const htmlBody = plainTextToHtml(draft.body);
    const metadata = {
      fromName,
      source: 'ai_approval',
      aiApprovalId: context.approvalId,
      aiAction: 'send_email',
      customerName: customer.name ?? undefined,
      organizationName: organization?.name ?? undefined,
    };

    let emailRecordId = existingEmail?.id;
    if (existingEmail) {
      await context.tx
        .update(emailHistory)
        .set({
          senderId: context.userId,
          fromAddress,
          toAddress: draft.to,
          customerId: customer.id,
          subject: draft.subject,
          bodyHtml: htmlBody,
          bodyText: draft.body,
          status: 'pending',
          metadata,
        })
        .where(eq(emailHistory.id, existingEmail.id));
    } else {
      const [createdEmail] = await context.tx
        .insert(emailHistory)
        .values({
          organizationId: context.organizationId,
          senderId: context.userId,
          fromAddress,
          toAddress: draft.to,
          customerId: customer.id,
          subject: draft.subject,
          bodyHtml: htmlBody,
          bodyText: draft.body,
          status: 'pending',
          metadata,
        } as NewEmailHistory)
        .returning({ id: emailHistory.id });

      emailRecordId = createdEmail.id;
    }

    if (!emailRecordId) {
      return {
        success: false,
        error: 'Unable to create email history for AI approval email',
      };
    }

    return {
      success: true,
      data: {
        emailHistoryId: emailRecordId,
        customerId: customer.id,
        recipientEmail: draft.to,
        subject: draft.subject,
        deliveryStatus: 'pending',
      },
      entityId: emailRecordId,
      entityType: 'email',
      postCommitEffect: {
        kind: 'send_email',
        payload: {
          approvalId: context.approvalId,
          emailHistoryId: emailRecordId,
          organizationId: context.organizationId,
          userId: context.userId,
          customerId: customer.id,
          customerName: customer.name,
          fromAddress,
          to: draft.to,
          subject: draft.subject,
          html: htmlBody,
          text: draft.body,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

export async function runHandlerPostCommitEffect(effect: HandlerPostCommitEffect): Promise<{
  success: boolean;
  error?: string;
}> {
  switch (effect.kind) {
    case 'send_email': {
      const resend = new Resend(getResendApiKey());
      const { payload } = effect;
      const { data: sendResult, error } = await resend.emails.send({
        from: payload.fromAddress,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      if (error) {
        await db
          .update(emailHistory)
          .set({
            status: 'failed',
          })
          .where(eq(emailHistory.id, payload.emailHistoryId));

        return {
          success: false,
          error: error.message || `Failed to send "${payload.subject}"`,
        };
      }

      await db
        .update(emailHistory)
        .set({
          status: 'sent',
          sentAt: new Date(),
          resendMessageId: sendResult?.id,
        })
        .where(eq(emailHistory.id, payload.emailHistoryId));

      await createEmailSentActivity({
        emailId: payload.emailHistoryId,
        organizationId: payload.organizationId,
        userId: payload.userId,
        customerId: payload.customerId,
        subject: payload.subject,
        recipientEmail: payload.to,
        recipientName: payload.customerName ?? undefined,
      });

      return { success: true };
    }
  }
}

/**
 * Delete record handler.
 * Soft-deletes a record by setting deletedAt.
 * Uses type-safe table references to prevent SQL injection.
 *
 * Note: Only supports entity types with soft delete (deletedAt column).
 * Quotes use status-based archival, not soft delete.
 */
async function deleteRecordHandler(
  actionData: Record<string, unknown>,
  context: HandlerContext
): Promise<HandlerResult> {
  try {
    // Validate action data with Zod
    const parseResult = deleteActionSchema.safeParse(actionData);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid delete action: ${parseResult.error.issues.map(i => i.message).join(', ')}`,
      };
    }

    const { entityType, entityId } = parseResult.data;

    const now = new Date();

    // Type-safe soft delete using Drizzle table objects
    // Each entity type uses its specific table for type safety and SQL injection prevention
    switch (entityType) {
      case 'customer': {
        await context.tx
          .update(customers)
          .set({ deletedAt: now })
          .where(
            and(
              eq(customers.id, entityId),
              eq(customers.organizationId, context.organizationId)
            )
          );
        break;
      }
      case 'order': {
        await context.tx
          .update(orders)
          .set({ deletedAt: now })
          .where(
            and(
              eq(orders.id, entityId),
              eq(orders.organizationId, context.organizationId)
            )
          );
        break;
      }
      case 'quote': {
        // Quotes don't have soft delete - archive by setting status to 'rejected'
        await context.tx
          .update(quotes)
          .set({ status: 'rejected' })
          .where(
            and(
              eq(quotes.id, entityId),
              eq(quotes.organizationId, context.organizationId)
            )
          );
        break;
      }
      default:
        return { success: false, error: `Unknown entity type: ${entityType}` };
    }

    return {
      success: true,
      data: { entityType, entityId, deleted: true },
      entityId,
      entityType,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete record',
    };
  }
}

/**
 * Update customer notes handler.
 * Stores notes in the customer's customFields JSONB column.
 * Enforces organization scoping for multi-tenant security.
 *
 * Note: Customers don't have a dedicated notes column, so notes are
 * stored in customFields.ai_notes to keep them separate from user fields.
 */
async function updateCustomerNotesHandler(
  actionData: Record<string, unknown>,
  context: HandlerContext
): Promise<HandlerResult> {
  try {
    // Validate action data with Zod
    const parseResult = updateNotesSchema.safeParse(actionData);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid update notes action: ${parseResult.error.issues.map(i => i.message).join(', ')}`,
      };
    }

    const { customerId, notes, customFields } = parseResult.data;
    // Support both direct notes and customFields.internalNotes
    const notesValue = notes ?? customFields?.internalNotes;

    // First fetch the current customer to merge customFields
    const [customer] = await context.tx
      .select({ customFields: customers.customFields })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, context.organizationId)
        )
      );

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found or access denied',
      };
    }

    // Merge notes into customFields under ai_notes key
    const updatedCustomFields = {
      ...(customer.customFields ?? {}),
      ai_notes: notesValue ?? null,
    };

    // Type-safe update with organization scoping for multi-tenant security
    const result = await context.tx
      .update(customers)
      .set({
        customFields: updatedCustomFields,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, context.organizationId)
        )
      )
      .returning({ id: customers.id });

    // Verify the update affected a row
    if (result.length === 0) {
      return {
        success: false,
        error: 'Customer not found or access denied',
      };
    }

    return {
      success: true,
      data: { customerId, updated: true },
      entityId: customerId,
      entityType: 'customer',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update customer notes',
    };
  }
}

// ============================================================================
// HANDLER REGISTRY
// ============================================================================

/**
 * Registry of action handlers.
 * Maps action names to their handler functions.
 */
export const actionHandlers: Record<string, ActionHandler> = {
  create_order: createOrderHandler,
  create_quote: createQuoteHandler,
  send_email: sendEmailHandler,
  delete_record: deleteRecordHandler,
  update_customer_notes: updateCustomerNotesHandler,
};

/**
 * Get handler for an action.
 * @param action - Action name
 * @returns Handler function or undefined if not found
 */
export function getActionHandler(action: string): ActionHandler | undefined {
  return actionHandlers[action];
}

/**
 * Check if an action has a registered handler.
 * @param action - Action name
 * @returns True if handler exists
 */
export function hasActionHandler(action: string): boolean {
  return action in actionHandlers;
}
