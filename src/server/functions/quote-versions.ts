/**
 * Quote Versions Server Functions
 *
 * API for quote creation, versioning, PDF generation, and sending.
 * All monetary values in AUD cents. GST is 10%.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-QUOTE-BUILDER-API)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, desc, sql, isNull, isNotNull, gt, lte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { quoteVersions, opportunities, opportunityActivities } from "drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createQuoteVersionSchema,
  quoteVersionFilterSchema,
  quoteVersionParamsSchema,
  restoreQuoteVersionSchema,
  updateQuoteExpirationSchema,
  sendQuoteSchema,
  type QuoteLineItem,
} from "@/lib/schemas/pipeline";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Australian GST rate */
const GST_RATE = 0.10;

/** Default quote validity in days */
const DEFAULT_QUOTE_VALIDITY_DAYS = 30;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate line item total from quantity and unit price, applying discount
 */
function calculateLineItemTotal(item: QuoteLineItem): number {
  const subtotal = item.quantity * item.unitPriceCents;
  const discount = item.discountPercent ? subtotal * (item.discountPercent / 100) : 0;
  return Math.round(subtotal - discount);
}

/**
 * Calculate quote totals from line items
 * @returns { subtotal, taxAmount, total } all in cents
 */
function calculateQuoteTotals(items: QuoteLineItem[]): {
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  // Recalculate each line item total to ensure consistency
  const processedItems = items.map((item) => ({
    ...item,
    totalCents: calculateLineItemTotal(item),
  }));

  const subtotal = processedItems.reduce((sum, item) => sum + item.totalCents, 0);
  const taxAmount = Math.round(subtotal * GST_RATE);
  const total = subtotal + taxAmount;

  return { subtotal, taxAmount, total };
}

/**
 * Get the next version number for an opportunity
 */
async function getNextVersionNumber(opportunityId: string): Promise<number> {
  const latest = await db
    .select({ versionNumber: quoteVersions.versionNumber })
    .from(quoteVersions)
    .where(eq(quoteVersions.opportunityId, opportunityId))
    .orderBy(desc(quoteVersions.versionNumber))
    .limit(1);

  return (latest[0]?.versionNumber ?? 0) + 1;
}

// ============================================================================
// CREATE QUOTE VERSION
// ============================================================================

/**
 * Create a new quote version for an opportunity.
 * Automatically calculates subtotal, GST (10%), and total.
 * Each save creates a new immutable version.
 */
export const createQuoteVersion = createServerFn({ method: "POST" })
  .inputValidator(createQuoteVersionSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

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
      throw new Error("Opportunity not found");
    }

    // Calculate totals
    const { subtotal, taxAmount, total } = calculateQuoteTotals(items);

    // Get next version number
    const versionNumber = await getNextVersionNumber(opportunityId);

    // Process line items to ensure totalCents is correct
    const processedItems = items.map((item) => ({
      ...item,
      totalCents: calculateLineItemTotal(item),
    }));

    // Create quote version
    const result = await db
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
    await db
      .update(opportunities)
      .set({
        value: total,
        weightedValue: Math.round(total * ((opportunity[0].probability ?? 50) / 100)),
        updatedBy: ctx.user.id,
      })
      .where(eq(opportunities.id, opportunityId));

    return { quoteVersion: result[0] };
  });

// ============================================================================
// GET QUOTE VERSION
// ============================================================================

/**
 * Get a single quote version by ID
 */
export const getQuoteVersion = createServerFn({ method: "GET" })
  .inputValidator(quoteVersionParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { id } = data;

    const version = await db
      .select()
      .from(quoteVersions)
      .where(
        and(
          eq(quoteVersions.id, id),
          eq(quoteVersions.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!version[0]) {
      throw new Error("Quote version not found");
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
export const listQuoteVersions = createServerFn({ method: "GET" })
  .inputValidator(quoteVersionFilterSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

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
      throw new Error("Opportunity not found");
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
 */
export const restoreQuoteVersion = createServerFn({ method: "POST" })
  .inputValidator(restoreQuoteVersionSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

    const { opportunityId, sourceVersionId, notes } = data;

    // Get the source version
    const sourceVersion = await db
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
      throw new Error("Source quote version not found");
    }

    // Verify it belongs to the same opportunity
    if (sourceVersion[0].opportunityId !== opportunityId) {
      throw new Error("Source version does not belong to this opportunity");
    }

    // Get next version number
    const versionNumber = await getNextVersionNumber(opportunityId);

    // Create new version with source content
    const restorationNotes = notes
      ? `Restored from v${sourceVersion[0].versionNumber}. ${notes}`
      : `Restored from v${sourceVersion[0].versionNumber}`;

    const result = await db
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

    return {
      quoteVersion: result[0],
      restoredFrom: sourceVersion[0].versionNumber,
    };
  });

// ============================================================================
// UPDATE QUOTE EXPIRATION
// ============================================================================

/**
 * Set or update the quote expiration date on the opportunity.
 * This affects when the quote is considered expired.
 */
export const updateQuoteExpiration = createServerFn({ method: "POST" })
  .inputValidator(updateQuoteExpirationSchema)
  .handler(async ({ data }): Promise<{opportunity: typeof opportunities.$inferSelect}> => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

    const { opportunityId, quoteExpiresAt } = data;

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
      throw new Error("Opportunity not found");
    }

    // Update expiration
    const result = await db
      .update(opportunities)
      .set({
        quoteExpiresAt,
        updatedBy: ctx.user.id,
      })
      .where(eq(opportunities.id, opportunityId))
      .returning();

    return { opportunity: result[0]! };
  });

/**
 * Set quote expiration to default (30 days from now)
 */
export const setDefaultQuoteExpiration = createServerFn({ method: "POST" })
  .inputValidator(z.object({ opportunityId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{opportunity: typeof opportunities.$inferSelect; expiresAt: Date}> => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

    const { opportunityId } = data;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_QUOTE_VALIDITY_DAYS);

    // Verify and update
    const result = await db
      .update(opportunities)
      .set({
        quoteExpiresAt: expiresAt,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!result[0]) {
      throw new Error("Opportunity not found");
    }

    return { opportunity: result[0]!, expiresAt };
  });

// ============================================================================
// GENERATE QUOTE PDF (Stub)
// ============================================================================

/**
 * Generate a PDF for a quote version.
 * Returns a URL to the generated PDF in Supabase storage.
 *
 * NOTE: Full PDF generation will be implemented in PIPE-QUOTE-BUILDER-UI
 * using React-PDF or similar. This stub provides the API contract.
 */
export const generateQuotePdf = createServerFn({ method: "POST" })
  .inputValidator(quoteVersionParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { id } = data;

    // Get the quote version
    const version = await db
      .select()
      .from(quoteVersions)
      .where(
        and(
          eq(quoteVersions.id, id),
          eq(quoteVersions.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!version[0]) {
      throw new Error("Quote version not found");
    }

    // TODO: Implement PDF generation with React-PDF
    // 1. Generate PDF content using React-PDF
    // 2. Upload to Supabase storage
    // 3. Return URL

    // For now, return a placeholder indicating PDF generation is not yet implemented
    return {
      quoteVersionId: id,
      pdfUrl: null,
      message: "PDF generation will be implemented in PIPE-QUOTE-BUILDER-UI",
      status: "not_implemented" as const,
    };
  });

// ============================================================================
// SEND QUOTE (Stub)
// ============================================================================

/**
 * Send a quote to the customer via email.
 *
 * NOTE: Full email sending will be implemented in the email integration.
 * This stub provides the API contract and validates inputs.
 */
export const sendQuote = createServerFn({ method: "POST" })
  .inputValidator(sendQuoteSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

    const {
      opportunityId,
      quoteVersionId,
      recipientEmail,
      recipientName,
      subject,
      message,
      ccEmails,
    } = data;

    // Verify quote version exists and belongs to opportunity
    const version = await db
      .select()
      .from(quoteVersions)
      .where(
        and(
          eq(quoteVersions.id, quoteVersionId),
          eq(quoteVersions.opportunityId, opportunityId),
          eq(quoteVersions.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!version[0]) {
      throw new Error("Quote version not found");
    }

    // Get opportunity for context
    const opportunity = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, opportunityId))
      .limit(1);

    // TODO: Implement email sending
    // 1. Generate or fetch PDF
    // 2. Send email with attachment
    // 3. Log activity on opportunity
    // 4. Update opportunity stage if needed

    // For now, return a placeholder
    return {
      quoteVersionId,
      recipientEmail,
      recipientName,
      subject: subject ?? `Quote for ${opportunity[0]?.title ?? "Opportunity"}`,
      message,
      ccEmails,
      status: "not_implemented" as const,
      message_detail: "Email sending will be implemented in email integration",
    };
  });

// ============================================================================
// COMPARE QUOTE VERSIONS
// ============================================================================

/**
 * Compare two quote versions to show differences.
 * Useful for showing what changed between versions.
 */
export const compareQuoteVersions = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      version1Id: z.string().uuid(),
      version2Id: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { version1Id, version2Id } = data;

    // Get both versions
    const [v1, v2] = await Promise.all([
      db
        .select()
        .from(quoteVersions)
        .where(
          and(
            eq(quoteVersions.id, version1Id),
            eq(quoteVersions.organizationId, ctx.organizationId)
          )
        )
        .limit(1),
      db
        .select()
        .from(quoteVersions)
        .where(
          and(
            eq(quoteVersions.id, version2Id),
            eq(quoteVersions.organizationId, ctx.organizationId)
          )
        )
        .limit(1),
    ]);

    if (!v1[0] || !v2[0]) {
      throw new Error("One or both quote versions not found");
    }

    // Verify same opportunity
    if (v1[0].opportunityId !== v2[0].opportunityId) {
      throw new Error("Quote versions must be from the same opportunity");
    }

    // Calculate differences
    const subtotalDiff = v2[0].subtotal - v1[0].subtotal;
    const taxDiff = v2[0].taxAmount - v1[0].taxAmount;
    const totalDiff = v2[0].total - v1[0].total;
    const itemCountDiff = v2[0].items.length - v1[0].items.length;

    return {
      version1: v1[0],
      version2: v2[0],
      differences: {
        subtotal: subtotalDiff,
        taxAmount: taxDiff,
        total: totalDiff,
        itemCount: itemCountDiff,
        subtotalPercent: v1[0].subtotal > 0 ? (subtotalDiff / v1[0].subtotal) * 100 : 0,
      },
    };
  });

// ============================================================================
// QUOTE VALIDITY
// ============================================================================

/**
 * Get quotes that are expiring within the warning period.
 * Default warning period is 7 days.
 */
export const getExpiringQuotes = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      warningDays: z.coerce.number().int().positive().default(7),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { warningDays } = data;

    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);

    // Get opportunities with quotes expiring within warning period
    const expiringOpportunities = await db
      .select({
        opportunityId: opportunities.id,
        opportunityTitle: opportunities.title,
        customerId: opportunities.customerId,
        quoteExpiresAt: opportunities.quoteExpiresAt,
        value: opportunities.value,
        stage: opportunities.stage,
        daysUntilExpiry: sql<number>`EXTRACT(DAY FROM (${opportunities.quoteExpiresAt} - NOW()))`,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.organizationId, ctx.organizationId),
          isNotNull(opportunities.quoteExpiresAt),
          gt(opportunities.quoteExpiresAt, now), // Not yet expired
          lte(opportunities.quoteExpiresAt, warningDate), // But expiring soon
          // Exclude won/lost
          sql`${opportunities.stage} NOT IN ('won', 'lost')`
        )
      )
      .orderBy(opportunities.quoteExpiresAt);

    return {
      expiringQuotes: expiringOpportunities.map((opp) => ({
        ...opp,
        daysUntilExpiry: Math.max(0, Math.ceil(Number(opp.daysUntilExpiry))),
      })),
      totalCount: expiringOpportunities.length,
      warningDays,
    };
  });

/**
 * Get quotes that have already expired.
 * These need attention - either extend or close the opportunity.
 */
export const getExpiredQuotes = createServerFn({ method: "GET" })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const now = new Date();

    // Get opportunities with expired quotes
    const expiredOpportunities = await db
      .select({
        opportunityId: opportunities.id,
        opportunityTitle: opportunities.title,
        customerId: opportunities.customerId,
        quoteExpiresAt: opportunities.quoteExpiresAt,
        value: opportunities.value,
        stage: opportunities.stage,
        daysSinceExpiry: sql<number>`EXTRACT(DAY FROM (NOW() - ${opportunities.quoteExpiresAt}))`,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.organizationId, ctx.organizationId),
          isNotNull(opportunities.quoteExpiresAt),
          lt(opportunities.quoteExpiresAt, now), // Already expired
          // Exclude won/lost
          sql`${opportunities.stage} NOT IN ('won', 'lost')`
        )
      )
      .orderBy(desc(sql`NOW() - ${opportunities.quoteExpiresAt}`));

    return {
      expiredQuotes: expiredOpportunities.map((opp) => ({
        ...opp,
        daysSinceExpiry: Math.ceil(Number(opp.daysSinceExpiry)),
      })),
      totalCount: expiredOpportunities.length,
    };
  });

/**
 * Extend quote validity with a reason for audit trail.
 */
export const extendQuoteValidity = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      opportunityId: z.string().uuid(),
      newExpirationDate: z.coerce.date(),
      reason: z.string().min(1, "Reason is required").max(500),
    })
  )
  .handler(async ({ data }): Promise<{opportunity: typeof opportunities.$inferSelect; previousExpiration: Date | null; newExpiration: Date}> => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

    const { opportunityId, newExpirationDate, reason } = data;

    // Get current opportunity
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
      throw new Error("Opportunity not found");
    }

    const oldExpiration = opportunity[0].quoteExpiresAt;

    // Validate new date is in the future
    if (newExpirationDate <= new Date()) {
      throw new Error("New expiration date must be in the future");
    }

    // Update expiration
    const result = await db
      .update(opportunities)
      .set({
        quoteExpiresAt: newExpirationDate,
        updatedBy: ctx.user.id,
      })
      .where(eq(opportunities.id, opportunityId))
      .returning();

    // Log activity for audit trail
    await db.insert(opportunityActivities).values({
      organizationId: ctx.organizationId,
      opportunityId,
      type: "note",
      description: `Quote validity extended from ${
        oldExpiration ? oldExpiration.toLocaleDateString("en-AU") : "unset"
      } to ${newExpirationDate.toLocaleDateString("en-AU")}. Reason: ${reason}`,
      createdBy: ctx.user.id,
      completedAt: new Date(),
    });

    return {
      opportunity: result[0]!,
      previousExpiration: oldExpiration,
      newExpiration: newExpirationDate,
    };
  });

/**
 * Check if a quote is valid (not expired) for conversion.
 * Returns validation result with option to override.
 */
export const validateQuoteForConversion = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      opportunityId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { opportunityId } = data;

    // Get opportunity with quote info
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
      throw new Error("Opportunity not found");
    }

    const opp = opportunity[0];
    const now = new Date();

    // Check if there's a quote
    const latestQuote = await db
      .select()
      .from(quoteVersions)
      .where(eq(quoteVersions.opportunityId, opportunityId))
      .orderBy(desc(quoteVersions.versionNumber))
      .limit(1);

    if (!latestQuote[0]) {
      return {
        isValid: false,
        reason: "no_quote",
        message: "No quote has been created for this opportunity",
        canOverride: false,
      };
    }

    // Check expiration
    if (opp.quoteExpiresAt) {
      if (opp.quoteExpiresAt < now) {
        const daysSinceExpiry = Math.ceil(
          (now.getTime() - opp.quoteExpiresAt.getTime()) / 86400000
        );
        return {
          isValid: false,
          reason: "expired",
          message: `Quote expired ${daysSinceExpiry} day(s) ago on ${opp.quoteExpiresAt.toLocaleDateString("en-AU")}`,
          canOverride: true,
          expirationDate: opp.quoteExpiresAt,
          daysSinceExpiry,
        };
      }

      // Check if expiring soon (warning)
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 7);
      if (opp.quoteExpiresAt < warningDate) {
        const daysUntilExpiry = Math.ceil(
          (opp.quoteExpiresAt.getTime() - now.getTime()) / 86400000
        );
        return {
          isValid: true,
          reason: "expiring_soon",
          message: `Quote expires in ${daysUntilExpiry} day(s) on ${opp.quoteExpiresAt.toLocaleDateString("en-AU")}`,
          canOverride: false,
          expirationDate: opp.quoteExpiresAt,
          daysUntilExpiry,
        };
      }
    }

    return {
      isValid: true,
      reason: "valid",
      message: "Quote is valid for conversion",
      canOverride: false,
      expirationDate: opp.quoteExpiresAt,
      quoteVersion: latestQuote[0].versionNumber,
    };
  });

/**
 * Get quote validity statistics for dashboard.
 */
export const getQuoteValidityStats = createServerFn({ method: "GET" })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Base conditions
    const baseConditions = [
      eq(opportunities.organizationId, ctx.organizationId),
      sql`${opportunities.stage} NOT IN ('won', 'lost')`,
    ];

    // Count expired
    const expiredResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(opportunities)
      .where(
        and(
          ...baseConditions,
          isNotNull(opportunities.quoteExpiresAt),
          lt(opportunities.quoteExpiresAt, now)
        )
      );

    // Count expiring soon (next 7 days)
    const expiringSoonResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(opportunities)
      .where(
        and(
          ...baseConditions,
          isNotNull(opportunities.quoteExpiresAt),
          gt(opportunities.quoteExpiresAt, now),
          lte(opportunities.quoteExpiresAt, sevenDaysFromNow)
        )
      );

    // Count valid
    const validResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(opportunities)
      .where(
        and(
          ...baseConditions,
          isNotNull(opportunities.quoteExpiresAt),
          gt(opportunities.quoteExpiresAt, sevenDaysFromNow)
        )
      );

    // Count no expiration set
    const noExpirationResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(opportunities)
      .where(and(...baseConditions, isNull(opportunities.quoteExpiresAt)));

    return {
      expired: Number(expiredResult[0]?.count ?? 0),
      expiringSoon: Number(expiringSoonResult[0]?.count ?? 0),
      valid: Number(validResult[0]?.count ?? 0),
      noExpiration: Number(noExpirationResult[0]?.count ?? 0),
      total:
        Number(expiredResult[0]?.count ?? 0) +
        Number(expiringSoonResult[0]?.count ?? 0) +
        Number(validResult[0]?.count ?? 0) +
        Number(noExpirationResult[0]?.count ?? 0),
    };
  });
