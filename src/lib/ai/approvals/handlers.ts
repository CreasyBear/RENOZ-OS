/**
 * AI Approval Action Handlers
 *
 * Registry of handlers for approved AI actions.
 * Each handler executes the drafted action within a transaction.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { db } from '@/lib/db';
import { orders, quotes, customers } from 'drizzle/schema';
import { eq, and } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

export interface HandlerContext {
  /** User ID executing the action */
  userId: string;
  /** Organization ID */
  organizationId: string;
  /** Approval ID for audit trail */
  approvalId: string;
  /** Database transaction */
  tx: typeof db;
}

export interface HandlerResult {
  /** Whether the action succeeded */
  success: boolean;
  /** Result data (e.g., created record ID) */
  data?: unknown;
  /** Error message if failed */
  error?: string;
}

export type ActionHandler = (
  actionData: Record<string, unknown>,
  context: HandlerContext
) => Promise<HandlerResult>;

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
    const draft = actionData.draft as Record<string, unknown>;
    if (!draft) {
      return { success: false, error: 'Missing draft data' };
    }

    const [order] = await context.tx
      .insert(orders)
      .values({
        ...draft,
        organizationId: context.organizationId,
        createdBy: context.userId,
        status: 'draft',
      } as typeof orders.$inferInsert)
      .returning({ id: orders.id });

    return { success: true, data: { orderId: order.id } };
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
    const draft = actionData.draft as Record<string, unknown>;
    if (!draft) {
      return { success: false, error: 'Missing draft data' };
    }

    const [quote] = await context.tx
      .insert(quotes)
      .values({
        ...draft,
        organizationId: context.organizationId,
        createdBy: context.userId,
        status: 'draft',
      } as typeof quotes.$inferInsert)
      .returning({ id: quotes.id });

    return { success: true, data: { quoteId: quote.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create quote',
    };
  }
}

/**
 * Send email handler.
 * Queues an email for sending via Resend.
 */
async function sendEmailHandler(
  actionData: Record<string, unknown>,
  _context: HandlerContext
): Promise<HandlerResult> {
  try {
    const draft = actionData.draft as {
      to: string;
      subject: string;
      body: string;
      customerId?: string;
    };

    if (!draft) {
      return { success: false, error: 'Missing email draft data' };
    }

    // TODO: Integrate with Resend email service
    // For now, return success with a mock result
    // The actual implementation will use the email library in src/lib/email/

    return {
      success: true,
      data: {
        emailId: `email_${Date.now()}`,
        status: 'queued',
        to: draft.to,
        subject: draft.subject,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
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
    const { entityType, entityId } = actionData as {
      entityType: string;
      entityId: string;
    };

    if (!entityType || !entityId) {
      return { success: false, error: 'Missing entityType or entityId' };
    }

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

    return { success: true, data: { entityType, entityId, deleted: true } };
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
    const { customerId, notes } = actionData as {
      customerId: string;
      notes: string;
    };

    if (!customerId) {
      return { success: false, error: 'Missing customerId' };
    }

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
      ai_notes: notes ?? null,
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

    return { success: true, data: { customerId, updated: true } };
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
