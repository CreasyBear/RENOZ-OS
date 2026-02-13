/**
 * Inbox Actions Server Functions
 *
 * Server functions for inbox email actions (mark as read, star, archive, delete).
 * Uses metadata JSONB field for user-specific state (read, starred, archived).
 *
 * @see SCHEMA-TRACE.md - Server function patterns
 * @see STANDARDS.md - Error handling patterns
 */

import { createServerFn } from "@tanstack/react-start";
import { and, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailHistory } from "drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { NotFoundError } from "@/lib/server/errors";
import { z } from "zod";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const markAsReadSchema = z.object({
  emailId: z.string().uuid(),
});

const markAllAsReadSchema = z.object({
  emailIds: z.array(z.string().uuid()).optional(),
});

const toggleStarredSchema = z.object({
  emailId: z.string().uuid(),
});

const archiveEmailSchema = z.object({
  emailId: z.string().uuid(),
});

const deleteEmailSchema = z.object({
  emailId: z.string().uuid(),
});

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Mark an email as read
 * Updates metadata JSONB field with user-specific read state
 */
export const markEmailAsRead = createServerFn({ method: "POST" })
  .inputValidator(markAsReadSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.email.read });

    // M05: Use atomic JSONB merge instead of read-modify-write
    const newFields = {
      read: true,
      readAt: new Date().toISOString(),
      readBy: ctx.user.id,
    };

    const result = await db
      .update(emailHistory)
      .set({
        metadata: sql`COALESCE(${emailHistory.metadata}, '{}'::jsonb) || ${JSON.stringify(newFields)}::jsonb`,
      })
      .where(
        and(
          eq(emailHistory.id, data.emailId),
          eq(emailHistory.organizationId, ctx.organizationId)
        )
      )
      .returning({ id: emailHistory.id });

    if (result.length === 0) {
      throw new NotFoundError("Email not found", "email_history");
    }

    return { success: true };
  });

/**
 * Mark all emails as read
 * Updates metadata for multiple emails
 */
export const markAllEmailsAsRead = createServerFn({ method: "POST" })
  .inputValidator(markAllAsReadSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.email.read });

    const filters = [eq(emailHistory.organizationId, ctx.organizationId)];

    // If specific email IDs provided, filter by them
    if (data.emailIds && data.emailIds.length > 0) {
      filters.push(inArray(emailHistory.id, data.emailIds));
    }

    // Update metadata for all matching emails
    // Use PostgreSQL JSONB merge operator to preserve existing metadata
    const updatedMetadata = {
      read: true,
      readAt: new Date().toISOString(),
      readBy: ctx.user.id,
    };

    await db
      .update(emailHistory)
      .set({
        metadata: sql`COALESCE(${emailHistory.metadata}, '{}'::jsonb) || ${JSON.stringify(updatedMetadata)}::jsonb`,
      })
      .where(and(...filters));

    return { success: true };
  });

/**
 * Toggle starred status for an email
 * Updates metadata JSONB field with starred state
 */
export const toggleEmailStarred = createServerFn({ method: "POST" })
  .inputValidator(toggleStarredSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.email.read });

    // M05: Toggle requires reading current state, but we use atomic JSONB merge for the update
    // Read current starred state
    const [email] = await db
      .select({ id: emailHistory.id, metadata: emailHistory.metadata })
      .from(emailHistory)
      .where(
        and(
          eq(emailHistory.id, data.emailId),
          eq(emailHistory.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!email) {
      throw new NotFoundError("Email not found", "email_history");
    }

    const currentMetadata = (email.metadata as Record<string, unknown> | null) ?? {};
    const isCurrentlyStarred = currentMetadata.starred === true;

    // Build new fields based on toggle direction
    const newFields: Record<string, unknown> = isCurrentlyStarred
      ? { starred: false, starredAt: null, starredBy: null }
      : { starred: true, starredAt: new Date().toISOString(), starredBy: ctx.user.id };

    await db
      .update(emailHistory)
      .set({
        metadata: sql`COALESCE(${emailHistory.metadata}, '{}'::jsonb) || ${JSON.stringify(newFields)}::jsonb`,
      })
      .where(
        and(
          eq(emailHistory.id, data.emailId),
          eq(emailHistory.organizationId, ctx.organizationId)
        )
      );

    return { success: true, starred: !isCurrentlyStarred };
  });

/**
 * Archive an email
 * Updates metadata JSONB field with archived state
 */
export const archiveEmail = createServerFn({ method: "POST" })
  .inputValidator(archiveEmailSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.email.read });

    // M05: Use atomic JSONB merge instead of read-modify-write
    const newFields = {
      archived: true,
      archivedAt: new Date().toISOString(),
      archivedBy: ctx.user.id,
    };

    const result = await db
      .update(emailHistory)
      .set({
        metadata: sql`COALESCE(${emailHistory.metadata}, '{}'::jsonb) || ${JSON.stringify(newFields)}::jsonb`,
      })
      .where(
        and(
          eq(emailHistory.id, data.emailId),
          eq(emailHistory.organizationId, ctx.organizationId)
        )
      )
      .returning({ id: emailHistory.id });

    if (result.length === 0) {
      throw new NotFoundError("Email not found", "email_history");
    }

    return { success: true };
  });

/**
 * Delete an email (soft delete via metadata)
 * Marks email as deleted in metadata JSONB field
 * Note: email_history is append-only, so we use soft delete
 */
export const deleteEmail = createServerFn({ method: "POST" })
  .inputValidator(deleteEmailSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.email.delete });

    // M05: Use atomic JSONB merge instead of read-modify-write
    const newFields = {
      deleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: ctx.user.id,
    };

    const result = await db
      .update(emailHistory)
      .set({
        metadata: sql`COALESCE(${emailHistory.metadata}, '{}'::jsonb) || ${JSON.stringify(newFields)}::jsonb`,
      })
      .where(
        and(
          eq(emailHistory.id, data.emailId),
          eq(emailHistory.organizationId, ctx.organizationId)
        )
      )
      .returning({ id: emailHistory.id });

    if (result.length === 0) {
      throw new NotFoundError("Email not found", "email_history");
    }

    return { success: true };
  });
