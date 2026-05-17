/**
 * Quote Versions Server Functions
 *
 * API for quote creation, versioning, and restoration.
 * All monetary values in AUD dollars (numeric(12,2)). GST is 10%.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-QUOTE-BUILDER-API)
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  opportunities,
  quoteVersions,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  createQuoteVersionSchema,
  type QuoteLineItem,
} from '@/lib/schemas';
import { GST_RATE } from '@/lib/order-calculations';
import { NotFoundError, ServerError } from '@/lib/server/errors';

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
      permission: PERMISSIONS.opportunity.update,
    });

    const { opportunityId, items, notes } = data;

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

      // Get next version number inside transaction to prevent race condition
      const latest = await tx
        .select({ versionNumber: quoteVersions.versionNumber })
        .from(quoteVersions)
        .where(
          and(
            eq(quoteVersions.opportunityId, opportunityId),
            eq(quoteVersions.organizationId, ctx.organizationId)
          )
        )
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

      if (!newVersion) {
        throw new ServerError('Unable to create quote version');
      }

      // Update opportunity value to match latest quote total
      const [updatedOpportunity] = await tx
        .update(opportunities)
        .set({
          value: total,
          weightedValue: Math.round(total * ((opportunity[0].probability ?? 50) / 100)),
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(opportunities.id, opportunityId),
            eq(opportunities.organizationId, ctx.organizationId)
          )
        )
        .returning({ id: opportunities.id });

      if (!updatedOpportunity) {
        throw new NotFoundError('Opportunity not found', 'opportunity');
      }

      return newVersion;
    });

    return { quoteVersion };
  });
