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
import { eq, and, sql, desc, isNull } from 'drizzle-orm';
import { customers, customerActivities, orders } from 'drizzle/schema';
import { aiApprovals } from 'drizzle/schema/_ai';
import {
  type CustomerWithMeta,
  type CustomerSearchResult,
  filterSensitiveFields,
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
    _context: contextSchema.describe('Execution context (auto-injected by API)'),
  }),
  execute: async ({ customerId, _context }): Promise<CustomerWithMeta | ReturnType<typeof createErrorResult>> => {
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
              eq(customers.organizationId, _context.organizationId),
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
      console.error('Error in getCustomerTool:', error);
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
    _context: contextSchema.describe('Execution context (auto-injected by API)'),
  }),
  execute: async ({ query, status, limit, _context }): Promise<
    { data: CustomerSearchResult[]; _meta: { count: number } } | ReturnType<typeof createErrorResult>
  > => {
    try {
      // Build conditions
      const conditions = [
        eq(customers.organizationId, _context.organizationId),
        isNull(customers.deletedAt),
        // Fuzzy search on name and email using ILIKE
        sql`(
          ${customers.name} ILIKE ${`%${query}%`}
          OR ${customers.email} ILIKE ${`%${query}%`}
        )`,
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
          // Prioritize exact name matches, then partial matches
          sql`CASE
            WHEN LOWER(${customers.name}) = LOWER(${query}) THEN 0
            WHEN LOWER(${customers.name}) LIKE LOWER(${query + '%'}) THEN 1
            ELSE 2
          END`,
          customers.name
        )
        .limit(limit);

      // Add similarity scores and filter sensitive fields
      const searchResultsWithScores: CustomerSearchResult[] = results.map(
        (r, index) => {
          // Filter out PII (email, phone) from each result
          const filtered = filterSensitiveFields(r);
          return {
            ...filtered,
            similarity: Math.max(0.5, 1 - index * 0.1), // Approximate scoring
          };
        }
      );

      return {
        data: searchResultsWithScores,
        _meta: { count: results.length },
      };
    } catch (error) {
      console.error('Error in searchCustomersTool:', error);
      return createErrorResult(
        'Search failed',
        'Try a different search query or check the spelling',
        'SEARCH_ERROR'
      );
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
    _context: contextSchema.describe('Execution context (auto-injected by API)'),
  }),
  execute: async ({ customerId, notes, appendMode, _context }) => {
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

      // Get existing notes from customFields
      const existingNotes = (customer.customFields as Record<string, unknown>)?.internalNotes as string || '';
      const newNotes = appendMode
        ? `${existingNotes}\n\n---\n\n${notes}`
        : notes;

      // Create approval record
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const [approval] = await db
        .insert(aiApprovals)
        .values({
          userId: _context.userId,
          organizationId: _context.organizationId,
          conversationId: _context.conversationId || null,
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
      console.error('Error in updateCustomerNotesTool:', error);
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
