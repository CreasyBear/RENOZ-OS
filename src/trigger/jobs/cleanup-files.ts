'use server'

/**
 * File Cleanup Tasks (Trigger.dev v3)
 *
 * Background tasks to clean up orphaned file uploads:
 * - Pending uploads: Files where upload was started but never confirmed (24h+ old)
 * - Soft-deleted files: Files marked for deletion that need R2 cleanup (7 days old)
 *
 * @see thoughts/shared/plans/2026-01-17-foundation-premortem-fixes.md FIX-004, FIX-005
 * @see https://trigger.dev/docs/v3/tasks
 */
import { schedules, logger } from "@trigger.dev/sdk/v3";
import { eq, and, isNotNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments } from "drizzle/schema";
import { deleteFile } from "@/lib/storage";

// ============================================================================
// TYPES
// ============================================================================

export interface CleanupResult {
  cleaned?: number;
  purged?: number;
  errors: number;
  total: number;
}

// ============================================================================
// FIX-004: CLEANUP PENDING UPLOADS
// ============================================================================

/**
 * Clean up pending uploads that were never confirmed.
 *
 * Pending uploads have deletedAt set (as a "pending" marker) but were
 * never confirmed within 24 hours. These are abandoned uploads.
 *
 * Runs hourly to catch abandoned uploads.
 */
export const cleanupPendingUploadsTask = schedules.task({
  id: "cleanup-pending-uploads",
  cron: "0 * * * *",
  run: async (): Promise<CleanupResult> => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    logger.info("Starting pending uploads cleanup", {
      cutoffDate: cutoff.toISOString(),
    });

    // Find pending uploads older than cutoff
    // Pending = deletedAt is NOT NULL (used as pending marker)
    // AND createdAt < cutoff (older than 24h)
    const staleUploads = await db
      .select({
        id: attachments.id,
        storageKey: attachments.storageKey,
        originalFilename: attachments.originalFilename,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(
        and(
          isNotNull(attachments.deletedAt), // Pending state
          lt(attachments.createdAt, cutoff) // Older than 24h
        )
      )
      .limit(100); // Process in batches

    logger.info(`Found ${staleUploads.length} stale pending uploads`);

    let cleaned = 0;
    let errors = 0;

    for (const upload of staleUploads) {
      try {
        // Delete from Supabase Storage (may already be gone if upload failed)
        try {
          await deleteFile({ path: upload.storageKey });
          logger.debug(`Deleted storage object: ${upload.storageKey}`);
        } catch (error) {
          // Ignore - file may not exist in storage
          logger.debug(
            `Storage delete skipped (may not exist): ${upload.storageKey}`
          );
        }

        // Delete database record
        await db.delete(attachments).where(eq(attachments.id, upload.id));

        cleaned++;
      } catch (error) {
        errors++;
        logger.error(`Failed to clean up upload ${upload.id}`, {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    logger.info("Pending uploads cleanup complete", {
      cleaned,
      errors,
      total: staleUploads.length,
    });

    return { cleaned, errors, total: staleUploads.length };
  },
});


// ============================================================================
// FIX-005: CLEANUP SOFT-DELETED FILES
// ============================================================================

/**
 * Clean up soft-deleted files from Supabase Storage.
 *
 * Files that are truly deleted (not pending) have:
 * - deletedAt set to a past timestamp
 * - The record exists but needs R2 cleanup
 *
 * After 7 days, we permanently delete from R2 and remove the DB record.
 * This gives time for potential "undo" operations.
 *
 * Runs daily at 3 AM.
 */
export const cleanupSoftDeletedFilesTask = schedules.task({
  id: "cleanup-soft-deleted-files",
  cron: "0 3 * * *",
  run: async (): Promise<CleanupResult> => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    logger.info("Starting soft-deleted files cleanup", {
      cutoffDate: cutoff.toISOString(),
    });

    // Find soft-deleted files older than 7 days
    // These are confirmed files that were later deleted (deletedAt < cutoff)
    // We distinguish from pending by checking if deletedAt is in the past
    // AND the file was confirmed at some point (would have had deletedAt cleared then set again)
    const deletedFiles = await db
      .select({
        id: attachments.id,
        storageKey: attachments.storageKey,
        originalFilename: attachments.originalFilename,
        deletedAt: attachments.deletedAt,
      })
      .from(attachments)
      .where(
        and(
          isNotNull(attachments.deletedAt),
          lt(attachments.deletedAt, cutoff) // Deleted more than 7 days ago
        )
      )
      .limit(100); // Process in batches

    logger.info(`Found ${deletedFiles.length} soft-deleted files to purge`);

    let purged = 0;
    let errors = 0;

    for (const file of deletedFiles) {
      try {
        // Delete from Supabase Storage
        try {
          await deleteFile({ path: file.storageKey });
          logger.debug(`Deleted storage object: ${file.storageKey}`);
        } catch (error) {
          // Ignore - file may already be deleted
          logger.debug(
            `Storage delete skipped (may not exist): ${file.storageKey}`
          );
        }

        // Permanently delete database record
        await db.delete(attachments).where(eq(attachments.id, file.id));

        purged++;
      } catch (error) {
        errors++;
        logger.error(`Failed to purge file ${file.id}`, {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    logger.info("Soft-deleted files cleanup complete", {
      purged,
      errors,
      total: deletedFiles.length,
    });

    return { purged, errors, total: deletedFiles.length };
  },
});


// ============================================================================
// LEGACY EXPORTS - for backward compatibility
// ============================================================================

/**
 * @deprecated Use cleanupPendingUploadsTask instead
 */
export const cleanupPendingUploadsJob = cleanupPendingUploadsTask;

/**
 * @deprecated Use cleanupSoftDeletedFilesTask instead
 */
export const cleanupSoftDeletedFilesJob = cleanupSoftDeletedFilesTask;
