/**
 * Email Suppression Server Functions
 *
 * Handles suppression list management for bounce, complaint, unsubscribe,
 * and manual suppression. Used by Resend webhook processing and campaign sends.
 *
 * @see INT-RES-003, INT-RES-004
 */

import { createServerFn } from "@tanstack/react-start";
import { and, eq, ilike, isNull, sql, inArray, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailSuppression } from "drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
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
      throw new Error("Suppression record not found or already removed");
    }

    return { success: true };
  });
