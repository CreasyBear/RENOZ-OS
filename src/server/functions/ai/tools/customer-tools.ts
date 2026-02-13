'use server'

/**
 * Customer Agent Tools
 *
 * Tools for the customer specialist agent to retrieve and manage customer data.
 * Implements AI-INFRA-014 acceptance criteria for customer domain.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';
import { eq, and, sql, desc, isNull, or, ilike } from 'drizzle-orm';
import { customers, customerActivities, orders } from 'drizzle/schema';
import { aiApprovals } from 'drizzle/schema/_ai';
import {
  type CustomerWithMeta,
  filterSensitiveFields,
  createApprovalResult,
  createErrorResult,
} from '@/lib/ai/tools/types';
import {
  formatAsTable,
  formatStatus,
  truncateId,
  formatResultSummary,
} from '@/lib/ai/tools/formatters';
import { type ToolExecutionContext } from '@/lib/ai/context/types';
import { containsPattern, escapeLike } from '@/lib/db/utils';
import { customersLogger } from '@/lib/logger';

// ============================================================================
// GET CUSTOMER TOOL
// ============================================================================

/**
 * Get a single customer with AI-computed metadata.
 */
export const getCustomerTool = tool({
  description:
    'Get detailed information about a specific customer including their order history, ' +
    'health metrics, and AI-computed metadata like churn risk and suggested actions. ' +
    'Use this when the user asks about a specific customer by name or ID.',
  inputSchema: z.object({
    customerId: z
      .string()
      .uuid()
      .describe('The unique identifier (UUID) of the customer to retrieve'),
  }),
  execute: async (
    { customerId },
    { experimental_context }
  ): Promise<CustomerWithMeta | ReturnType<typeof createErrorResult>> => {
    const ctx = experimental_context as ToolExecutionContext | undefined;

    if (!ctx?.organizationId || !ctx?.userId) {
      return createErrorResult(
        'Organization context missing',
        'Unable to process request without organization context',
        'CONTEXT_ERROR'
      );
    }

    try {
      // Execute all three queries in parallel for better performance
      const [customerResult, activityResult, overdueResult] = await Promise.all([
        // Get customer with org scoping
        db
          .select()
          .from(customers)
          .where(
            and(
              eq(customers.id, customerId),
              eq(customers.organizationId, ctx.organizationId),
              isNull(customers.deletedAt)
            )
          )
          .limit(1),

        // Get last activity date
        db
          .select({ createdAt: customerActivities.createdAt })
          .from(customerActivities)
          .where(eq(customerActivities.customerId, customerId))
          .orderBy(desc(customerActivities.createdAt))
          .limit(1),

        // Get overdue invoices count
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(orders)
          .where(
            and(
              eq(orders.customerId, customerId),
              sql`${orders.paymentStatus} = 'pending'`,
              sql`${orders.dueDate} < CURRENT_DATE`,
              isNull(orders.deletedAt)
            )
          ),
      ]);

      const [customer] = customerResult;
      const [lastActivity] = activityResult;

      if (!customer) {
        return createErrorResult(
          'Customer not found',
          'Verify the customer ID is correct and belongs to your organization',
          'NOT_FOUND'
        );
      }

      // Calculate days since last contact
      const daysSinceLastContact = lastActivity?.createdAt
        ? Math.floor(
            (Date.now() - new Date(lastActivity.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      // Calculate churn risk based on health score and activity
      let churnRisk: 'low' | 'medium' | 'high' | null = null;
      if (customer.healthScore !== null) {
        if (customer.healthScore >= 70) {
          churnRisk = 'low';
        } else if (customer.healthScore >= 40) {
          churnRisk = 'medium';
        } else {
          churnRisk = 'high';
        }
      }

      // Generate suggested actions
      const suggestedActions: string[] = [];
      const [overdueCount] = overdueResult;
      const hasOverdueInvoices = (overdueCount?.count ?? 0) > 0;

      if (hasOverdueInvoices) {
        suggestedActions.push('Follow up on overdue invoices');
      }
      if (daysSinceLastContact && daysSinceLastContact > 30) {
        suggestedActions.push('Schedule a check-in call');
      }
      if (churnRisk === 'high') {
        suggestedActions.push('Review account health and create retention plan');
      }
      if (customer.status === 'prospect') {
        suggestedActions.push('Follow up to convert to active customer');
      }

      return filterSensitiveFields({
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          status: customer.status,
          type: customer.type,
          healthScore: customer.healthScore,
          totalRevenue: customer.totalOrderValue ? Number(customer.totalOrderValue) : null,
          createdAt: customer.createdAt,
        },
        _meta: {
          hasOverdueInvoices,
          daysSinceLastContact,
          churnRisk,
          suggestedActions,
        },
      });
    } catch (error) {
      customersLogger.error('Error in getCustomerTool', error);
      return createErrorResult(
        'Failed to retrieve customer',
        'Try again or contact support if the issue persists',
        'INTERNAL_ERROR'
      );
    }
  },
});

// ============================================================================
// SEARCH CUSTOMERS TOOL
// ============================================================================

/**
 * Search customers using fuzzy matching.
 * Yields formatted markdown table for better UX.
 */
export const searchCustomersTool = tool({
  description:
    'Search for customers by name or email using fuzzy matching. ' +
    'Returns up to 10 most relevant results. ' +
    'Use this when the user wants to find a customer but only has partial information.',
  inputSchema: z.object({
    query: z
      .string()
      .min(2)
      .max(100)
      .describe('Search query to match against customer name or email'),
    status: z
      .enum(['active', 'inactive', 'prospect', 'suspended', 'blacklisted'])
      .optional()
      .describe('Filter by customer status'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(10)
      .describe('Maximum number of results to return'),
  }),
  execute: async function* (
    { query, status, limit },
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
      // Build conditions (use containsPattern for safe search)
      const searchPattern = containsPattern(query);
      const conditions = [
        eq(customers.organizationId, ctx.organizationId),
        isNull(customers.deletedAt),
        or(
          ilike(customers.name, searchPattern),
          ilike(customers.email, searchPattern)
        )!,
      ];

      if (status) {
        conditions.push(eq(customers.status, status));
      }

      // Execute search with similarity scoring
      const results = await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          status: customers.status,
          type: customers.type,
        })
        .from(customers)
        .where(and(...conditions))
        .orderBy(
          // Prioritize exact name matches, then partial matches (escapeLike for safe prefix pattern)
          sql`CASE
            WHEN LOWER(${customers.name}) = LOWER(${query}) THEN 0
            WHEN LOWER(${customers.name}) LIKE LOWER(${escapeLike(query) + '%'}) THEN 1
            ELSE 2
          END`,
          customers.name
        )
        .limit(limit);

      if (results.length === 0) {
        yield {
          text: `No customers found matching "${query}".`,
        };
        return;
      }

      // Filter sensitive fields before display
      const filteredResults = results.map((r) => filterSensitiveFields(r));

      // Format as markdown table
      const table = formatAsTable(filteredResults, [
        { key: 'id', header: 'ID', format: (v) => truncateId(v as string) },
        { key: 'name', header: 'Name' },
        { key: 'status', header: 'Status', format: (v) => formatStatus(v as string) },
        { key: 'type', header: 'Type' },
      ]);

      const summary = formatResultSummary(
        results.length,
        'customer',
        `matching "${query}"`
      );

      yield {
        text: `${table}\n\n${summary}`,
      };
    } catch (error) {
      customersLogger.error('Error in searchCustomersTool', error);
      yield {
        text: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}. Try a different search query.`,
      };
    }
  },
});

// ============================================================================
// UPDATE CUSTOMER NOTES TOOL
// ============================================================================

/**
 * Update customer internal notes (requires approval).
 * Uses customFields since customers table doesn't have a direct notes column.
 */
export const updateCustomerNotesTool = tool({
  description:
    'Update the internal notes for a customer. ' +
    'This creates a draft that requires human approval before being applied. ' +
    'Use this when the user wants to add or update notes about a customer.',
  inputSchema: z.object({
    customerId: z
      .string()
      .uuid()
      .describe('The unique identifier (UUID) of the customer'),
    notes: z
      .string()
      .max(5000)
      .describe('The new internal notes content to set for the customer'),
    appendMode: z
      .boolean()
      .default(false)
      .describe('If true, append to existing notes instead of replacing'),
  }),
  execute: async (
    { customerId, notes, appendMode },
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
      // Verify customer exists and belongs to org
      const [customer] = await db
        .select({
          id: customers.id,
          name: customers.name,
          customFields: customers.customFields,
        })
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

      // Get existing notes from customFields
      const existingNotes = (customer.customFields as Record<string, unknown>)?.internalNotes as string || '';
      const newNotes = appendMode
        ? `${existingNotes}\n\n---\n\n${notes}`
        : notes;

      // Create approval record in transaction to prevent orphaned records
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const approval = await db.transaction(async (tx) => {
        const [approvalRecord] = await tx
          .insert(aiApprovals)
          .values({
            userId: ctx.userId,
            organizationId: ctx.organizationId,
            conversationId: ctx.conversationId || null,
            action: 'update_customer_notes',
            agent: 'customer',
            actionData: {
              actionType: 'update_customer_notes',
              draft: {
                customerId,
                customFields: { internalNotes: newNotes },
              },
              availableActions: ['approve', 'edit', 'discard'],
              diff: {
                before: { internalNotes: existingNotes },
                after: { internalNotes: newNotes },
              },
            },
            expiresAt,
          })
          .returning({ id: aiApprovals.id });

        return approvalRecord;
      });

      return createApprovalResult(
        'update_customer_notes',
        { customerId, customFields: { internalNotes: newNotes } },
        approval.id,
        `Update notes for customer "${customer.name}"`,
        {
          before: { internalNotes: existingNotes },
          after: { internalNotes: newNotes },
        }
      );
    } catch (error) {
      customersLogger.error('Error in updateCustomerNotesTool', error);
      return createErrorResult(
        'Failed to create notes update draft',
        'Try again or contact support if the issue persists',
        'INTERNAL_ERROR'
      );
    }
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All customer tools bundled for the customer agent.
 */
export const customerTools = {
  get_customer: getCustomerTool,
  search_customers: searchCustomersTool,
  update_customer_notes: updateCustomerNotesTool,
} as const;

export type CustomerTools = typeof customerTools;
