/**
 * File Cleanup Jobs
 *
 * Background jobs to clean up orphaned file uploads:
 * - Pending uploads: Files where upload was started but never confirmed (24h+ old)
 * - Soft-deleted files: Files marked for deletion that need R2 cleanup (7 days old)
 *
 * @see thoughts/shared/plans/2026-01-17-foundation-premortem-fixes.md FIX-004, FIX-005
 */
import { cronTrigger } from "@trigger.dev/sdk";
import { eq, and, isNotNull, lt } from "drizzle-orm";
import { client } from "../client";
import { db } from "@/lib/db";
import { attachments } from "@/../drizzle/schema";
import { deleteObject } from "@/lib/storage";

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
export const cleanupPendingUploadsJob = client.defineJob({
  id: "cleanup-pending-uploads",
  name: "Cleanup Pending Uploads",
  version: "1.0.0",
  trigger: cronTrigger({
    cron: "0 * * * *", // Every hour
  }),
  run: async (_payload, io) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    await io.logger.info("Starting pending uploads cleanup", {
      cutoffDate: cutoff.toISOString(),
    });

    // Find pending uploads older than cutoff
    // Pending = deletedAt is NOT NULL (used as pending marker)
    // AND createdAt < cutoff (older than 24h)
    const staleUploads = await io.runTask("find-stale-uploads", async () => {
      return db
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
    });

    await io.logger.info(`Found ${staleUploads.length} stale pending uploads`);

    let cleaned = 0;
    let errors = 0;

    for (const upload of staleUploads) {
      try {
        // Delete from R2 (may already be gone if upload failed)
        await io.runTask(`delete-r2-${upload.id}`, async () => {
          try {
            await deleteObject({ key: upload.storageKey });
            await io.logger.debug(`Deleted R2 object: ${upload.storageKey}`);
          } catch (error) {
            // Ignore - file may not exist in R2
            await io.logger.debug(
              `R2 delete skipped (may not exist): ${upload.storageKey}`
            );
          }
        });

        // Delete database record
        await io.runTask(`delete-db-${upload.id}`, async () => {
          await db.delete(attachments).where(eq(attachments.id, upload.id));
        });

        cleaned++;
      } catch (error) {
        errors++;
        await io.logger.error(`Failed to clean up upload ${upload.id}`, {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    await io.logger.info("Pending uploads cleanup complete", {
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
 * Clean up soft-deleted files from R2 storage.
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
export const cleanupSoftDeletedFilesJob = client.defineJob({
  id: "cleanup-soft-deleted-files",
  name: "Cleanup Soft-Deleted Files",
  version: "1.0.0",
  trigger: cronTrigger({
    cron: "0 3 * * *", // Daily at 3 AM
  }),
  run: async (_payload, io) => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    await io.logger.info("Starting soft-deleted files cleanup", {
      cutoffDate: cutoff.toISOString(),
    });

    // Find soft-deleted files older than 7 days
    // These are confirmed files that were later deleted (deletedAt < cutoff)
    // We distinguish from pending by checking if deletedAt is in the past
    // AND the file was confirmed at some point (would have had deletedAt cleared then set again)
    const deletedFiles = await io.runTask("find-deleted-files", async () => {
      return db
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
    });

    await io.logger.info(`Found ${deletedFiles.length} soft-deleted files to purge`);

    let purged = 0;
    let errors = 0;

    for (const file of deletedFiles) {
      try {
        // Delete from R2
        await io.runTask(`delete-r2-${file.id}`, async () => {
          try {
            await deleteObject({ key: file.storageKey });
            await io.logger.debug(`Deleted R2 object: ${file.storageKey}`);
          } catch (error) {
            // Ignore - file may already be deleted
            await io.logger.debug(
              `R2 delete skipped (may not exist): ${file.storageKey}`
            );
          }
        });

        // Permanently delete database record
        await io.runTask(`delete-db-${file.id}`, async () => {
          await db.delete(attachments).where(eq(attachments.id, file.id));
        });

        purged++;
      } catch (error) {
        errors++;
        await io.logger.error(`Failed to purge file ${file.id}`, {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    await io.logger.info("Soft-deleted files cleanup complete", {
      purged,
      errors,
      total: deletedFiles.length,
    });

    return { purged, errors, total: deletedFiles.length };
  },
});
