/**
 * Email Suppression Server Functions
 *
 * Handles suppression list management for bounce, complaint, unsubscribe,
 * and manual suppression. Used by Resend webhook processing and campaign sends.
 *
 * @see INT-RES-003, INT-RES-004
 */

import { createServerFn } from "@tanstack/react-start";
import { and, eq, ilike, isNull, sql, inArray, desc, asc, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailSuppression } from "drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { NotFoundError } from "@/lib/server/errors";
import {
  suppressionListFiltersSchema,
  checkSuppressionSchema,
  checkSuppressionBatchSchema,
  addSuppressionSchema,
  removeSuppressionSchema,
  type SuppressionListResult,
  type CheckSuppressionResult,
  type CheckSuppressionBatchResult,
  type SuppressionRecord,
} from "@/lib/schemas/communications/email-suppression";

// ============================================================================
// GET SUPPRESSION LIST
// ============================================================================

/**
 * Get paginated list of suppressed emails with optional filters.
 */
export const getSuppressionList = createServerFn({ method: "GET" })
  .inputValidator(suppressionListFiltersSchema)
  .handler(async ({ data }): Promise<SuppressionListResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.read });

    const {
      reason,
      search,
      includeDeleted = false,
      page = 1,
      pageSize = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = data;

    // Build conditions
    const conditions = [eq(emailSuppression.organizationId, ctx.organizationId)];

    // Exclude soft-deleted unless explicitly requested
    if (!includeDeleted) {
      conditions.push(isNull(emailSuppression.deletedAt));
    }

    // Filter by reason
    if (reason) {
      conditions.push(eq(emailSuppression.reason, reason));
    }

    // Search by email
    if (search) {
      conditions.push(ilike(emailSuppression.email, `%${search}%`));
    }

    // Build order by
    const orderByColumn =
      sortBy === "email"
        ? emailSuppression.email
        : sortBy === "reason"
          ? emailSuppression.reason
          : emailSuppression.createdAt;

    const orderByDirection = sortOrder === "asc" ? asc : desc;

    // Count total matching records
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailSuppression)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Fetch paginated results
    const items = await db
      .select()
      .from(emailSuppression)
      .where(and(...conditions))
      .orderBy(orderByDirection(orderByColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: items as SuppressionRecord[],
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  });

// ============================================================================
// CHECK IF EMAIL IS SUPPRESSED
// ============================================================================

/**
 * Check if a single email is suppressed.
 * Returns suppression details if found.
 */
export const isEmailSuppressed = createServerFn({ method: "GET" })
  .inputValidator(checkSuppressionSchema)
  .handler(async ({ data }): Promise<CheckSuppressionResult> => {
    const ctx = await withAuth();

    const normalizedEmail = data.email.toLowerCase().trim();

    // Check for active suppression in this organization
    const [suppression] = await db
      .select({
        reason: emailSuppression.reason,
        bounceType: emailSuppression.bounceType,
        createdAt: emailSuppression.createdAt,
      })
      .from(emailSuppression)
      .where(
        and(
          eq(emailSuppression.organizationId, ctx.organizationId),
          eq(emailSuppression.email, normalizedEmail),
          isNull(emailSuppression.deletedAt)
        )
      )
      .limit(1);

    if (suppression) {
      return {
        email: normalizedEmail,
        isSuppressed: true,
        reason: suppression.reason,
        bounceType: suppression.bounceType,
        suppressedAt: suppression.createdAt,
      };
    }

    return {
      email: normalizedEmail,
      isSuppressed: false,
      reason: null,
      bounceType: null,
      suppressedAt: null,
    };
  });

// ============================================================================
// BATCH CHECK SUPPRESSION
// ============================================================================

/**
 * Check multiple emails for suppression status.
 * Optimized for campaign sends with up to 1000 emails per batch.
 */
export const checkSuppressionBatch = createServerFn({ method: "POST" })
  .inputValidator(checkSuppressionBatchSchema)
  .handler(async ({ data }): Promise<CheckSuppressionBatchResult> => {
    const ctx = await withAuth();

    // Normalize all emails
    const normalizedEmails = data.emails.map((e) => e.toLowerCase().trim());

    // Fetch all suppressions in one query
    const suppressions = await db
      .select({
        email: emailSuppression.email,
        reason: emailSuppression.reason,
        bounceType: emailSuppression.bounceType,
        createdAt: emailSuppression.createdAt,
      })
      .from(emailSuppression)
      .where(
        and(
          eq(emailSuppression.organizationId, ctx.organizationId),
          inArray(emailSuppression.email, normalizedEmails),
          isNull(emailSuppression.deletedAt)
        )
      );

    // Create lookup map for fast access
    const suppressionMap = new Map(
      suppressions.map((s) => [s.email, s])
    );

    // Build results for all emails
    const results: CheckSuppressionResult[] = normalizedEmails.map((email) => {
      const suppression = suppressionMap.get(email);
      if (suppression) {
        return {
          email,
          isSuppressed: true,
          reason: suppression.reason,
          bounceType: suppression.bounceType,
          suppressedAt: suppression.createdAt,
        };
      }
      return {
        email,
        isSuppressed: false,
        reason: null,
        bounceType: null,
        suppressedAt: null,
      };
    });

    return {
      results,
      suppressedCount: suppressions.length,
      totalChecked: normalizedEmails.length,
    };
  });

// ============================================================================
// ADD TO SUPPRESSION LIST
// ============================================================================

/**
 * Add an email to the suppression list.
 * Handles upsert to avoid duplicates.
 */
export const addSuppression = createServerFn({ method: "POST" })
  .inputValidator(addSuppressionSchema)
  .handler(async ({ data }): Promise<SuppressionRecord> => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    const normalizedEmail = data.email.toLowerCase().trim();

    // Check for existing active suppression
    const [existing] = await db
      .select()
      .from(emailSuppression)
      .where(
        and(
          eq(emailSuppression.organizationId, ctx.organizationId),
          eq(emailSuppression.email, normalizedEmail),
          isNull(emailSuppression.deletedAt)
        )
      )
      .limit(1);

    if (existing) {
      // Return existing record - email is already suppressed
      return existing as SuppressionRecord;
    }

    // Insert new suppression
    const [inserted] = await db
      .insert(emailSuppression)
      .values({
        organizationId: ctx.organizationId,
        email: normalizedEmail,
        reason: data.reason,
        bounceType: data.bounceType ?? null,
        source: data.source ?? "manual",
        resendEventId: data.resendEventId ?? null,
        metadata: data.metadata ?? {},
      })
      .returning();

    return inserted as SuppressionRecord;
  });

// ============================================================================
// REMOVE FROM SUPPRESSION LIST (SOFT DELETE)
// ============================================================================

/**
 * Remove an email from the suppression list via soft delete.
 * Preserves audit trail for compliance.
 */
export const removeSuppression = createServerFn({ method: "POST" })
  .inputValidator(removeSuppressionSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    const [updated] = await db
      .update(emailSuppression)
      .set({
        deletedAt: new Date(),
        deletedBy: ctx.user.id,
        deletedReason: data.reason ?? "Manual removal",
      })
      .where(
        and(
          eq(emailSuppression.id, data.id),
          eq(emailSuppression.organizationId, ctx.organizationId),
          isNull(emailSuppression.deletedAt)
        )
      )
      .returning({ id: emailSuppression.id });

    if (!updated) {
      throw new NotFoundError("Suppression record not found or already removed", "email_suppression");
    }

    return { success: true };
  });

// ============================================================================
// INTERNAL FUNCTIONS (for Trigger.dev jobs - no auth required)
// ============================================================================

/**
 * Internal function to add email to suppression list.
 * Used by webhook processing and other background jobs.
 * Does not require auth context.
 *
 * @see INT-RES-004
 */
export async function addSuppressionDirect(params: {
  organizationId: string;
  email: string;
  reason: "bounce" | "complaint" | "unsubscribe" | "manual";
  bounceType?: "hard" | "soft" | null;
  source?: "webhook" | "manual" | "import" | "api";
  resendEventId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; isNew: boolean }> {
  const normalizedEmail = params.email.toLowerCase().trim();

  // Check for existing active suppression
  const [existing] = await db
    .select({ id: emailSuppression.id })
    .from(emailSuppression)
    .where(
      and(
        eq(emailSuppression.organizationId, params.organizationId),
        eq(emailSuppression.email, normalizedEmail),
        isNull(emailSuppression.deletedAt)
      )
    )
    .limit(1);

  if (existing) {
    // Email is already suppressed
    return { id: existing.id, isNew: false };
  }

  // Insert new suppression
  const [inserted] = await db
    .insert(emailSuppression)
    .values({
      organizationId: params.organizationId,
      email: normalizedEmail,
      reason: params.reason,
      bounceType: params.bounceType ?? null,
      source: params.source ?? "webhook",
      resendEventId: params.resendEventId ?? null,
      metadata: params.metadata ?? {},
    })
    .returning({ id: emailSuppression.id });

  return { id: inserted.id, isNew: true };
}

/**
 * Internal function to check suppression status for a single email.
 * Used by scheduled email processing.
 * Does not require auth context.
 *
 * @see INT-RES-004
 */
export async function isEmailSuppressedDirect(
  organizationId: string,
  email: string
): Promise<{
  suppressed: boolean;
  reason?: "bounce" | "complaint" | "unsubscribe" | "manual";
  bounceType?: "hard" | "soft" | null;
}> {
  const normalizedEmail = email.toLowerCase().trim();

  const [suppression] = await db
    .select({
      reason: emailSuppression.reason,
      bounceType: emailSuppression.bounceType,
    })
    .from(emailSuppression)
    .where(
      and(
        eq(emailSuppression.organizationId, organizationId),
        eq(emailSuppression.email, normalizedEmail),
        isNull(emailSuppression.deletedAt)
      )
    )
    .limit(1);

  if (suppression) {
    return {
      suppressed: true,
      reason: suppression.reason,
      bounceType: suppression.bounceType,
    };
  }

  return { suppressed: false };
}

/**
 * Internal function to batch check suppression status.
 * Used by campaign sends for efficient batch filtering.
 * Does not require auth context.
 *
 * @see INT-RES-004
 */
export async function checkSuppressionBatchDirect(
  organizationId: string,
  emails: string[]
): Promise<
  Array<{
    email: string;
    suppressed: boolean;
    reason?: "bounce" | "complaint" | "unsubscribe" | "manual";
  }>
> {
  if (emails.length === 0) {
    return [];
  }

  const normalizedEmails = emails.map((e) => e.toLowerCase().trim());

  // Fetch all suppressions in one query
  const suppressions = await db
    .select({
      email: emailSuppression.email,
      reason: emailSuppression.reason,
    })
    .from(emailSuppression)
    .where(
      and(
        eq(emailSuppression.organizationId, organizationId),
        inArray(emailSuppression.email, normalizedEmails),
        isNull(emailSuppression.deletedAt)
      )
    );

  // Create lookup map
  const suppressionMap = new Map(suppressions.map((s) => [s.email, s.reason]));

  // Build results
  return normalizedEmails.map((email) => {
    const reason = suppressionMap.get(email);
    return {
      email,
      suppressed: !!reason,
      reason: reason ?? undefined,
    };
  });
}

// ============================================================================
// SOFT BOUNCE TRACKING (INT-RES-004)
// ============================================================================

/**
 * Soft bounce threshold for auto-suppression.
 * After this many soft bounces within SOFT_BOUNCE_WINDOW_DAYS, the email is suppressed.
 */
const SOFT_BOUNCE_THRESHOLD = 3;

/**
 * Time window (in days) to count soft bounces.
 * Only bounces within this window count toward the threshold.
 */
const SOFT_BOUNCE_WINDOW_DAYS = 7;

/**
 * Track a soft bounce occurrence.
 * - If no existing record: create one with bounceCount=1
 * - If existing record within window: increment bounceCount
 * - If bounceCount >= SOFT_BOUNCE_THRESHOLD: auto-suppress
 *
 * Returns the new bounce count and whether suppression was triggered.
 *
 * @see INT-RES-004
 */
export async function trackSoftBounce(params: {
  organizationId: string;
  email: string;
  resendEventId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{
  id: string;
  bounceCount: number;
  suppressed: boolean;
  isNew: boolean;
}> {
  const normalizedEmail = params.email.toLowerCase().trim();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - SOFT_BOUNCE_WINDOW_DAYS);

  // Check for existing soft bounce record within the time window
  const [existing] = await db
    .select({
      id: emailSuppression.id,
      bounceCount: emailSuppression.bounceCount,
      createdAt: emailSuppression.createdAt,
    })
    .from(emailSuppression)
    .where(
      and(
        eq(emailSuppression.organizationId, params.organizationId),
        eq(emailSuppression.email, normalizedEmail),
        eq(emailSuppression.reason, "bounce"),
        eq(emailSuppression.bounceType, "soft"),
        isNull(emailSuppression.deletedAt),
        gte(emailSuppression.createdAt, windowStart)
      )
    )
    .limit(1);

  if (existing) {
    // Increment the bounce count
    const newBounceCount = (existing.bounceCount ?? 0) + 1;
    const shouldSuppress = newBounceCount >= SOFT_BOUNCE_THRESHOLD;

    await db
      .update(emailSuppression)
      .set({
        bounceCount: newBounceCount,
        // Update resendEventId to the latest event
        resendEventId: params.resendEventId ?? undefined,
        // Merge new metadata with existing
        metadata: params.metadata
          ? sql`COALESCE(${emailSuppression.metadata}, '{}'::jsonb) || ${JSON.stringify(params.metadata)}::jsonb`
          : undefined,
      })
      .where(eq(emailSuppression.id, existing.id));

    return {
      id: existing.id,
      bounceCount: newBounceCount,
      suppressed: shouldSuppress,
      isNew: false,
    };
  }

  // No existing record within window - create a new one
  const [inserted] = await db
    .insert(emailSuppression)
    .values({
      organizationId: params.organizationId,
      email: normalizedEmail,
      reason: "bounce",
      bounceType: "soft",
      bounceCount: 1,
      source: "webhook",
      resendEventId: params.resendEventId ?? null,
      metadata: params.metadata ?? {},
    })
    .returning({ id: emailSuppression.id });

  return {
    id: inserted.id,
    bounceCount: 1,
    suppressed: false, // First bounce doesn't suppress
    isNew: true,
  };
}
