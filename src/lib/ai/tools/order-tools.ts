/**
 * Order Agent Tools
 *
 * Tools for the order specialist agent to retrieve and manage orders.
 * Implements AI-INFRA-014 acceptance criteria for order domain.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';
import { eq, and, sql, desc, isNull, gte, lte } from 'drizzle-orm';
import { orders, customers } from 'drizzle/schema';
import { aiApprovals } from 'drizzle/schema/_ai';
import {
  type OrderSummary,
  type InvoiceSummary,
  createApprovalResult,
  createErrorResult,
} from './types';

// ============================================================================
// SHARED CONTEXT SCHEMA
// ============================================================================

const contextSchema = z.object({
  userId: z.string().uuid().describe('Current user ID (injected by API)'),
  organizationId: z.string().uuid().describe('Current organization ID (injected by API)'),
  conversationId: z.string().uuid().optional().describe('Current conversation ID (if any)'),
});

// ============================================================================
// GET ORDERS TOOL
// ============================================================================

/**
 * Get orders with filtering and pagination.
 */
export const getOrdersTool = tool({
  description:
    'Get a list of orders with optional filtering by customer, status, date range, and payment status. ' +
    'Returns order summaries with customer name and totals. ' +
    'Use this when the user asks about orders, recent sales, or order history.',
  inputSchema: z.object({
    customerId: z
      .string()
      .uuid()
      .optional()
      .describe('Filter orders by customer ID'),
    status: z
      .enum([
        'draft',
        'confirmed',
        'picking',
        'picked',
        'shipped',
        'delivered',
        'cancelled',
      ])
      .optional()
      .describe('Filter by order status'),
    paymentStatus: z
      .enum(['pending', 'partial', 'paid', 'overdue', 'refunded'])
      .optional()
      .describe('Filter by payment status'),
    startDate: z
      .string()
      .optional()
      .describe('Start date for order date filter (ISO format YYYY-MM-DD)'),
    endDate: z
      .string()
      .optional()
      .describe('End date for order date filter (ISO format YYYY-MM-DD)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20)
      .describe('Maximum number of orders to return'),
    _context: contextSchema.describe('Execution context (auto-injected by API)'),
  }),
  execute: async ({ customerId, status, paymentStatus, startDate, endDate, limit, _context }): Promise<
    | { data: OrderSummary[]; _meta: { count: number; hasMore: boolean } }
    | ReturnType<typeof createErrorResult>
  > => {
    try {
      // Build conditions
      const conditions = [
        eq(orders.organizationId, _context.organizationId),
        isNull(orders.deletedAt),
      ];

      if (customerId) {
        conditions.push(eq(orders.customerId, customerId));
      }
      if (status) {
        conditions.push(eq(orders.status, status));
      }
      if (paymentStatus) {
        conditions.push(eq(orders.paymentStatus, paymentStatus));
      }
      if (startDate) {
        conditions.push(gte(orders.orderDate, startDate));
      }
      if (endDate) {
        conditions.push(lte(orders.orderDate, endDate));
      }

      // Query orders with customer join
      const results = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customerId: orders.customerId,
          customerName: customers.name,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          total: orders.total,
          orderDate: orders.orderDate,
          dueDate: orders.dueDate,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(and(...conditions))
        .orderBy(desc(orders.orderDate))
        .limit(limit + 1); // Fetch one extra to check hasMore

      const hasMore = results.length > limit;
      const items = results.slice(0, limit);

      const orderSummaries: OrderSummary[] = items.map((r) => ({
        id: r.id,
        orderNumber: r.orderNumber,
        customerName: r.customerName || 'Unknown Customer',
        status: r.status,
        paymentStatus: r.paymentStatus,
        total: r.total ? Number(r.total) : null,
        orderDate: r.orderDate,
        dueDate: r.dueDate,
      }));

      return {
        data: orderSummaries,
        _meta: {
          count: items.length,
          hasMore,
        },
      };
    } catch (error) {
      console.error('Error in getOrdersTool:', error);
      return createErrorResult(
        'Failed to retrieve orders',
        'Try narrowing your search criteria or contact support',
        'INTERNAL_ERROR'
      );
    }
  },
});

// ============================================================================
// GET INVOICES TOOL
// ============================================================================

/**
 * Get invoices (orders with payment focus) with filtering.
 */
export const getInvoicesTool = tool({
  description:
    'Get a list of invoices with focus on payment status and amounts due. ' +
    'Shows overdue days for unpaid invoices. ' +
    'Use this when the user asks about invoices, payments due, or accounts receivable.',
  inputSchema: z.object({
    customerId: z
      .string()
      .uuid()
      .optional()
      .describe('Filter invoices by customer ID'),
    status: z
      .enum(['pending', 'partial', 'paid', 'overdue', 'refunded'])
      .optional()
      .describe('Filter by payment status'),
    overdueOnly: z
      .boolean()
      .default(false)
      .describe('Only return overdue invoices'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20)
      .describe('Maximum number of invoices to return'),
    _context: contextSchema.describe('Execution context (auto-injected by API)'),
  }),
  execute: async ({ customerId, status, overdueOnly, limit, _context }): Promise<
    | { data: InvoiceSummary[]; _meta: { count: number; totalOverdue: number } }
    | ReturnType<typeof createErrorResult>
  > => {
    try {
      // Build conditions
      const conditions = [
        eq(orders.organizationId, _context.organizationId),
        isNull(orders.deletedAt),
        // Only include orders that have been confirmed (invoiced)
        sql`${orders.status} NOT IN ('draft', 'cancelled')`,
      ];

      if (customerId) {
        conditions.push(eq(orders.customerId, customerId));
      }
      if (status) {
        conditions.push(eq(orders.paymentStatus, status));
      }
      if (overdueOnly) {
        conditions.push(
          sql`${orders.paymentStatus} IN ('pending', 'partial')`,
          sql`${orders.dueDate} < CURRENT_DATE`
        );
      }

      // Query with customer join
      const results = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customerName: customers.name,
          paymentStatus: orders.paymentStatus,
          total: orders.total,
          paidAmount: orders.paidAmount,
          balanceDue: orders.balanceDue,
          dueDate: orders.dueDate,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(and(...conditions))
        .orderBy(desc(orders.dueDate))
        .limit(limit);

      // Calculate days overdue and total overdue amount
      let totalOverdue = 0;
      const invoiceSummaries: InvoiceSummary[] = results.map((r) => {
        const daysOverdue =
          r.dueDate && r.paymentStatus !== 'paid'
            ? Math.max(
                0,
                Math.floor(
                  (Date.now() - new Date(r.dueDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : 0;

        if (daysOverdue > 0 && r.balanceDue) {
          totalOverdue += Number(r.balanceDue);
        }

        return {
          id: r.id,
          invoiceNumber: r.orderNumber, // Using order number as invoice number
          customerName: r.customerName || 'Unknown Customer',
          status: r.paymentStatus,
          total: r.total ? Number(r.total) : null,
          paidAmount: r.paidAmount ? Number(r.paidAmount) : null,
          balanceDue: r.balanceDue ? Number(r.balanceDue) : null,
          dueDate: r.dueDate,
          daysOverdue,
        };
      });

      return {
        data: invoiceSummaries,
        _meta: {
          count: results.length,
          totalOverdue,
        },
      };
    } catch (error) {
      console.error('Error in getInvoicesTool:', error);
      return createErrorResult(
        'Failed to retrieve invoices',
        'Try narrowing your search criteria or contact support',
        'INTERNAL_ERROR'
      );
    }
  },
});

// ============================================================================
// CREATE ORDER DRAFT TOOL
// ============================================================================

/**
 * Create an order draft (requires approval).
 */
export const createOrderDraftTool = tool({
  description:
    'Create a draft order for a customer. ' +
    'This creates a draft that requires human approval before the order is created. ' +
    'Use this when the user wants to create a new order for a customer.',
  inputSchema: z.object({
    customerId: z
      .string()
      .uuid()
      .describe('The customer ID to create the order for'),
    lineItems: z
      .array(
        z.object({
          productId: z.string().uuid().describe('Product ID'),
          quantity: z.number().int().min(1).describe('Quantity'),
          unitPrice: z.number().min(0).optional().describe('Override unit price'),
          notes: z.string().max(500).optional().describe('Line item notes'),
        })
      )
      .min(1)
      .max(50)
      .describe('Line items for the order'),
    notes: z
      .string()
      .max(2000)
      .optional()
      .describe('Internal notes for the order'),
    customerNotes: z
      .string()
      .max(2000)
      .optional()
      .describe('Notes visible to customer'),
    _context: contextSchema.describe('Execution context (auto-injected by API)'),
  }),
  execute: async ({ customerId, lineItems, notes, customerNotes, _context }) => {
    try {
      // Verify customer exists
      const [customer] = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.organizationId, _context.organizationId),
            isNull(customers.deletedAt)
          )
        )
        .limit(1);

      if (!customer) {
        return createErrorResult(
          'Customer not found',
          'Verify the customer ID is correct and belongs to your organization',
          'NOT_FOUND'
        );
      }

      // Create draft data
      const draft = {
        customerId,
        lineItems,
        notes,
        customerNotes,
        status: 'draft',
      };

      // Create approval record
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [approval] = await db
        .insert(aiApprovals)
        .values({
          userId: _context.userId,
          organizationId: _context.organizationId,
          conversationId: _context.conversationId || null,
          action: 'create_order',
          agent: 'order',
          actionData: {
            actionType: 'create_order',
            draft,
            availableActions: ['approve', 'edit', 'discard'],
          },
          expiresAt,
        })
        .returning({ id: aiApprovals.id });

      return createApprovalResult(
        'create_order',
        draft,
        approval.id,
        `Create order for "${customer.name}" with ${lineItems.length} item(s)`
      );
    } catch (error) {
      console.error('Error in createOrderDraftTool:', error);
      return createErrorResult(
        'Failed to create order draft',
        'Verify all product IDs are valid and try again',
        'INTERNAL_ERROR'
      );
    }
  },
});

// ============================================================================
// CREATE QUOTE DRAFT TOOL
// ============================================================================

/**
 * Create a quote draft (requires approval).
 */
export const createQuoteDraftTool = tool({
  description:
    'Create a draft quote for a customer. ' +
    'This creates a draft that requires human approval before the quote is created. ' +
    'Use this when the user wants to create a new quote or proposal for a customer.',
  inputSchema: z.object({
    customerId: z
      .string()
      .uuid()
      .describe('The customer ID to create the quote for'),
    title: z
      .string()
      .min(1)
      .max(200)
      .describe('Quote title or description'),
    lineItems: z
      .array(
        z.object({
          productId: z.string().uuid().describe('Product ID'),
          quantity: z.number().int().min(1).describe('Quantity'),
          unitPrice: z.number().min(0).optional().describe('Override unit price'),
          notes: z.string().max(500).optional().describe('Line item notes'),
        })
      )
      .min(1)
      .max(50)
      .describe('Line items for the quote'),
    validUntil: z
      .string()
      .optional()
      .describe('Quote validity end date (ISO format YYYY-MM-DD)'),
    notes: z
      .string()
      .max(2000)
      .optional()
      .describe('Internal notes for the quote'),
    customerNotes: z
      .string()
      .max(2000)
      .optional()
      .describe('Notes visible to customer'),
    _context: contextSchema.describe('Execution context (auto-injected by API)'),
  }),
  execute: async ({ customerId, title, lineItems, validUntil, notes, customerNotes, _context }) => {
    try {
      // Verify customer exists
      const [customer] = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.organizationId, _context.organizationId),
            isNull(customers.deletedAt)
          )
        )
        .limit(1);

      if (!customer) {
        return createErrorResult(
          'Customer not found',
          'Verify the customer ID is correct and belongs to your organization',
          'NOT_FOUND'
        );
      }

      // Create draft data
      const draft = {
        customerId,
        title,
        lineItems,
        validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Default 30 days
        notes,
        customerNotes,
        status: 'draft',
      };

      // Create approval record
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [approval] = await db
        .insert(aiApprovals)
        .values({
          userId: _context.userId,
          organizationId: _context.organizationId,
          conversationId: _context.conversationId || null,
          action: 'create_quote',
          agent: 'order',
          actionData: {
            actionType: 'create_quote',
            draft,
            availableActions: ['approve', 'edit', 'discard'],
          },
          expiresAt,
        })
        .returning({ id: aiApprovals.id });

      return createApprovalResult(
        'create_quote',
        draft,
        approval.id,
        `Create quote "${title}" for "${customer.name}" with ${lineItems.length} item(s)`
      );
    } catch (error) {
      console.error('Error in createQuoteDraftTool:', error);
      return createErrorResult(
        'Failed to create quote draft',
        'Verify all product IDs are valid and try again',
        'INTERNAL_ERROR'
      );
    }
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All order tools bundled for the order agent.
 */
export const orderTools = {
  get_orders: getOrdersTool,
  get_invoices: getInvoicesTool,
  create_order_draft: createOrderDraftTool,
  create_quote_draft: createQuoteDraftTool,
} as const;

export type OrderTools = typeof orderTools;
