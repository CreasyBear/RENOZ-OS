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
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import {
  opportunities,
  quoteVersions,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  createQuoteVersionSchema,
  quoteVersionFilterSchema,
  quoteVersionParamsSchema,
  restoreQuoteVersionSchema,
  type QuoteLineItem,
} from '@/lib/schemas';
import { GST_RATE } from '@/lib/order-calculations';
import { NotFoundError, ValidationError } from '@/lib/server/errors';

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
