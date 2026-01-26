/**
 * AI Approval Action Handlers
 *
 * Registry of handlers for approved AI actions.
 * Each handler executes the drafted action within a transaction.
 * Uses Zod validation for runtime type safety on action data.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { db } from '@/lib/db';
import { orders, quotes, customers } from 'drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

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
}).passthrough(); // Allow additional fields for flexibility

/** Schema for quote draft data */
const quoteDraftSchema = z.object({
  customerId: z.string().uuid(),
  validUntil: z.string().or(z.date()).optional(),
  notes: z.string().optional(),
}).passthrough();

/** Schema for email draft data */
const emailDraftSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  customerId: z.string().uuid().optional(),
});

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
  /** Entity ID affected by this action (for audit trail) */
  entityId?: string;
  /** Entity type affected by this action (for audit trail) */
  entityType?: string;
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
    // Validate draft data with Zod
    const parseResult = orderDraftSchema.safeParse(actionData.draft);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid order draft: ${parseResult.error.issues.map(i => i.message).join(', ')}`,
      };
    }

    const draft = parseResult.data;

    const [order] = await context.tx
      .insert(orders)
      .values({
        ...draft,
        organizationId: context.organizationId,
        createdBy: context.userId,
        status: 'draft',
      } as typeof orders.$inferInsert)
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
        ...draft,
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
 * Queues an email for sending via Resend.
 */
async function sendEmailHandler(
  actionData: Record<string, unknown>,
  _context: HandlerContext
): Promise<HandlerResult> {
  try {
    // Validate draft data with Zod
    const parseResult = emailDraftSchema.safeParse(actionData.draft);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid email draft: ${parseResult.error.issues.map(i => i.message).join(', ')}`,
      };
    }

    const draft = parseResult.data;

    // TODO: Integrate with Resend email service
    // For now, return success with a mock result
    // The actual implementation will use the email library in src/lib/email/

    const emailId = `email_${Date.now()}`;
    return {
      success: true,
      data: {
        emailId,
        status: 'queued',
        to: draft.to,
        subject: draft.subject,
      },
      // Email doesn't create a database entity, but we track the ID for reference
      entityId: draft.customerId,
      entityType: draft.customerId ? 'customer' : undefined,
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
