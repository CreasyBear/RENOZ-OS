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
  createApprovalResult,
  createErrorResult,
} from './types';
import {
  formatAsTable,
  formatCurrency,
  formatDate,
  formatStatus,
  formatDaysOverdue,
  formatResultSummary,
} from './formatters';
import { type ToolExecutionContext } from '@/lib/ai/context/types';

// ============================================================================
// GET ORDERS TOOL
// ============================================================================

/**
 * Get orders with filtering and pagination.
 * Yields formatted markdown table for better UX.
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
  }),
  execute: async function* (
    { customerId, status, paymentStatus, startDate, endDate, limit },
    { experimental_context }
  ) {
    const ctx = experimental_context as ToolExecutionContext | undefined;

    if (!ctx?.organizationId) {
      yield {
        text: 'Organization context missing. Unable to process request.',
      };
      return;
    }

    try {
      // Build conditions
      const conditions = [
        eq(orders.organizationId, ctx.organizationId),
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

      if (items.length === 0) {
        yield {
          text: 'No orders found matching the specified criteria.',
        };
        return;
      }

      // Prepare data for table
      const tableData = items.map((r) => ({
        orderNumber: r.orderNumber,
        customerName: r.customerName || 'Unknown',
        status: r.status,
        paymentStatus: r.paymentStatus,
        total: r.total,
        orderDate: r.orderDate,
      }));

      // Format as markdown table
      const table = formatAsTable(tableData, [
        { key: 'orderNumber', header: 'Order #' },
        { key: 'customerName', header: 'Customer' },
        { key: 'status', header: 'Status', format: (v) => formatStatus(v as string) },
        { key: 'paymentStatus', header: 'Payment', format: (v) => formatStatus(v as string) },
        { key: 'total', header: 'Total', format: (v) => formatCurrency(v as number | null) },
        { key: 'orderDate', header: 'Date', format: (v) => formatDate(v as string | null) },
      ]);

      // Build summary with filters applied
      const filterParts: string[] = [];
      if (status) filterParts.push(`status: ${status}`);
      if (paymentStatus) filterParts.push(`payment: ${paymentStatus}`);
      if (startDate || endDate) filterParts.push(`date range: ${startDate || 'start'} to ${endDate || 'now'}`);

      const summary = formatResultSummary(
        items.length,
        'order',
        filterParts.length > 0 ? `(${filterParts.join(', ')})` : undefined
      );
      const moreText = hasMore ? ' _More results available._' : '';

      yield {
        text: `${table}\n\n${summary}${moreText}`,
      };
    } catch (error) {
      console.error('Error in getOrdersTool:', error);
      yield {
        text: `Failed to retrieve orders: ${error instanceof Error ? error.message : 'Unknown error'}. Try narrowing your search criteria.`,
      };
    }
  },
});

// ============================================================================
// GET INVOICES TOOL
// ============================================================================

/**
 * Get invoices (orders with payment focus) with filtering.
 * Yields formatted markdown table for better UX.
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
  }),
  execute: async function* (
    { customerId, status, overdueOnly, limit },
    { experimental_context }
  ) {
    const ctx = experimental_context as ToolExecutionContext | undefined;

    if (!ctx?.organizationId) {
      yield {
        text: 'Organization context missing. Unable to process request.',
      };
      return;
    }

    try {
      // Build conditions
      const conditions = [
        eq(orders.organizationId, ctx.organizationId),
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

      if (results.length === 0) {
        const qualifier = overdueOnly ? 'overdue ' : '';
        yield {
          text: `No ${qualifier}invoices found matching the specified criteria.`,
        };
        return;
      }

      // Calculate days overdue and total overdue amount
      let totalOverdue = 0;
      const tableData = results.map((r) => {
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
          invoiceNumber: r.orderNumber,
          customerName: r.customerName || 'Unknown',
          paymentStatus: r.paymentStatus,
          total: r.total,
          balanceDue: r.balanceDue,
          dueDate: r.dueDate,
          daysOverdue,
        };
      });

      // Format as markdown table
      const table = formatAsTable(tableData, [
        { key: 'invoiceNumber', header: 'Invoice #' },
        { key: 'customerName', header: 'Customer' },
        { key: 'paymentStatus', header: 'Status', format: (v) => formatStatus(v as string) },
        { key: 'total', header: 'Total', format: (v) => formatCurrency(v as number | null) },
        { key: 'balanceDue', header: 'Balance', format: (v) => formatCurrency(v as number | null) },
        { key: 'dueDate', header: 'Due', format: (v) => formatDate(v as string | null) },
        { key: 'daysOverdue', header: 'Overdue', format: (v) => formatDaysOverdue(v as number) },
      ]);

      // Build summary
      const qualifier = overdueOnly ? 'overdue ' : '';
      const summary = formatResultSummary(results.length, `${qualifier}invoice`);
      const overdueNote = totalOverdue > 0
        ? `\n\n**Total overdue:** ${formatCurrency(totalOverdue)}`
        : '';

      yield {
        text: `${table}\n\n${summary}${overdueNote}`,
      };
    } catch (error) {
      console.error('Error in getInvoicesTool:', error);
      yield {
        text: `Failed to retrieve invoices: ${error instanceof Error ? error.message : 'Unknown error'}. Try narrowing your search criteria.`,
      };
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
  }),
  execute: async (
    { customerId, lineItems, notes, customerNotes },
    { experimental_context }
  ) => {
    const ctx = experimental_context as ToolExecutionContext | undefined;

    if (!ctx?.organizationId || !ctx?.userId) {
      return createErrorResult(
        'Organization context missing',
        'Unable to process request without organization context',
        'CONTEXT_ERROR'
      );
    }

    try {
      // Verify customer exists
      const [customer] = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.organizationId, ctx.organizationId),
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

      // Create approval record in transaction to prevent orphaned records
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const approval = await db.transaction(async (tx) => {
        const [approvalRecord] = await tx
          .insert(aiApprovals)
          .values({
            userId: ctx.userId,
            organizationId: ctx.organizationId,
            conversationId: ctx.conversationId || null,
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

        return approvalRecord;
      });

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
  }),
  execute: async (
    { customerId, title, lineItems, validUntil, notes, customerNotes },
    { experimental_context }
  ) => {
    const ctx = experimental_context as ToolExecutionContext | undefined;

    if (!ctx?.organizationId || !ctx?.userId) {
      return createErrorResult(
        'Organization context missing',
        'Unable to process request without organization context',
        'CONTEXT_ERROR'
      );
    }

    try {
      // Verify customer exists
      const [customer] = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.organizationId, ctx.organizationId),
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

      // Create approval record in transaction to prevent orphaned records
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const approval = await db.transaction(async (tx) => {
        const [approvalRecord] = await tx
          .insert(aiApprovals)
          .values({
            userId: ctx.userId,
            organizationId: ctx.organizationId,
            conversationId: ctx.conversationId || null,
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

        return approvalRecord;
      });

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
