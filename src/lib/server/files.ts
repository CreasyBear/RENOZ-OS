/**
 * File Upload Server Functions
 *
 * Server-side operations for file upload, download, and management.
 * Files are stored in Cloudflare R2 with metadata in Postgres.
 *
 * Upload flow:
 * 1. Client requests presigned URL (getPresignedUploadUrl)
 * 2. Client uploads directly to R2 using presigned URL
 * 3. Client confirms upload (confirmUpload) - verifies file exists
 *
 * @see drizzle/schema/files/attachments.ts for database schema
 * @see src/lib/schemas/files.ts for Zod schemas
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, isNull, isNotNull, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { attachments } from "../../../drizzle/schema";
import { withAuth } from "./protected";
import { NotFoundError, ValidationError } from "./errors";
import {
  presignedUploadRequestSchema,
  confirmUploadRequestSchema,
  listAttachmentsQuerySchema,
  isAllowedMimeType,
  type PresignedUploadResponse,
  type ConfirmUploadResponse,
  type PresignedDownloadResponse,
  type ListAttachmentsResponse,
  type DeleteAttachmentResponse,
} from "@/lib/schemas/files";
import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  headObject,
  deleteObject,
} from "@/lib/storage";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a unique storage key for a file.
 * Format: {orgId}/{entityType}/{uuid}-{sanitized-filename}
 */
function generateStorageKey(
  orgId: string,
  entityType: string | undefined,
  filename: string
): string {
  const uuid = crypto.randomUUID();
  const sanitized = sanitizeFilename(filename);
  const category = entityType || "general";
  return `${orgId}/${category}/${uuid}-${sanitized}`;
}

/**
 * Sanitize filename for safe storage.
 * Removes special characters and spaces.
 */
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100); // Limit length
}

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

/**
 * Get a presigned URL for uploading a file to R2.
 *
 * Creates a pending attachment record (with deletedAt set) that will be
 * confirmed after successful upload.
 *
 * Required: Authentication
 */
export const getPresignedUploadUrl = createServerFn({ method: "POST" })
  .inputValidator(presignedUploadRequestSchema)
  .handler(async ({ data }): Promise<PresignedUploadResponse> => {
    const ctx = await withAuth();

    // Generate storage key
    const storageKey = generateStorageKey(
      ctx.organizationId,
      data.entityType,
      data.filename
    );

    // Create pending attachment (deletedAt = NOW as pending marker)
    const [attachment] = await db
      .insert(attachments)
      .values({
        organizationId: ctx.organizationId,
        uploadedBy: ctx.user.id,
        filename: sanitizeFilename(data.filename),
        originalFilename: data.filename,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        storageKey,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        deletedAt: new Date(), // Mark as pending
      })
      .returning({ id: attachments.id });

    // Generate presigned upload URL
    const { uploadUrl, expiresAt } = await generatePresignedUploadUrl({
      key: storageKey,
      mimeType: data.mimeType,
    });

    return {
      uploadUrl,
      attachmentId: attachment.id,
      expiresAt: expiresAt.toISOString(),
    };
  });

/**
 * Confirm that an upload completed successfully.
 *
 * Verifies the file exists in R2 and clears the deletedAt marker.
 *
 * Required: Authentication
 */
export const confirmUpload = createServerFn({ method: "POST" })
  .inputValidator(confirmUploadRequestSchema)
  .handler(async ({ data }): Promise<ConfirmUploadResponse> => {
    const ctx = await withAuth();

    // Get the pending attachment (must have deletedAt set - indicating pending state)
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.id, data.attachmentId),
          eq(attachments.organizationId, ctx.organizationId),
          isNotNull(attachments.deletedAt) // Only pending uploads have deletedAt set
        )
      )
      .limit(1);

    if (!attachment) {
      throw new NotFoundError("Upload not found or already confirmed");
    }

    // Verify file exists in R2
    const fileInfo = await headObject({ key: attachment.storageKey });
    if (!fileInfo) {
      throw new NotFoundError("File not found in storage. Upload may have failed.");
    }

    // Verify actual content type matches claimed type (server-side security check)
    const actualMimeType = fileInfo.contentType;
    if (actualMimeType && actualMimeType !== attachment.mimeType) {
      console.warn(
        `MIME type mismatch: claimed=${attachment.mimeType}, actual=${actualMimeType}, attachmentId=${data.attachmentId}`
      );

      // If actual type is not allowed, reject the upload entirely
      if (!isAllowedMimeType(actualMimeType)) {
        // Delete the malicious file from R2
        await deleteObject({ key: attachment.storageKey });
        // Delete the attachment record
        await db.delete(attachments).where(eq(attachments.id, data.attachmentId));
        throw new ValidationError("Uploaded file type not allowed", {
          mimeType: ["File type mismatch detected. Upload rejected for security."],
        });
      }

      // If actual type is allowed but different, update the record with actual type
      await db
        .update(attachments)
        .set({ mimeType: actualMimeType })
        .where(eq(attachments.id, data.attachmentId));
    }

    // Confirm by clearing deletedAt
    const [confirmed] = await db
      .update(attachments)
      .set({ deletedAt: null })
      .where(eq(attachments.id, data.attachmentId))
      .returning({
        id: attachments.id,
        filename: attachments.filename,
        originalFilename: attachments.originalFilename,
        mimeType: attachments.mimeType,
        sizeBytes: attachments.sizeBytes,
        entityType: attachments.entityType,
        entityId: attachments.entityId,
        createdAt: attachments.createdAt,
      });

    return {
      attachment: {
        ...confirmed,
        createdAt: confirmed.createdAt.toISOString(),
      },
    };
  });

// ============================================================================
// DOWNLOAD FUNCTIONS
// ============================================================================

/**
 * Get a presigned URL for downloading a file from R2.
 *
 * Required: Authentication, attachment must belong to user's org
 */
export const getPresignedDownloadUrl = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => {
    if (typeof input !== "object" || input === null) {
      throw new Error("Invalid input");
    }
    const { attachmentId } = input as { attachmentId?: string };
    if (!attachmentId || typeof attachmentId !== "string") {
      throw new Error("attachmentId is required");
    }
    return { attachmentId };
  })
  .handler(async ({ data }): Promise<PresignedDownloadResponse> => {
    const ctx = await withAuth();

    // Get attachment
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.id, data.attachmentId),
          eq(attachments.organizationId, ctx.organizationId),
          isNull(attachments.deletedAt)
        )
      )
      .limit(1);

    if (!attachment) {
      throw new NotFoundError("Attachment not found");
    }

    // Generate presigned download URL
    const { downloadUrl, expiresAt } = await generatePresignedDownloadUrl({
      key: attachment.storageKey,
    });

    return {
      downloadUrl,
      filename: attachment.originalFilename,
      expiresAt: expiresAt.toISOString(),
    };
  });

// ============================================================================
// LIST FUNCTIONS
// ============================================================================

/**
 * List attachments for an entity or organization.
 *
 * Required: Authentication
 */
export const listAttachments = createServerFn({ method: "GET" })
  .inputValidator(listAttachmentsQuerySchema)
  .handler(async ({ data }): Promise<ListAttachmentsResponse> => {
    const ctx = await withAuth();

    // Build where clause
    const conditions = [
      eq(attachments.organizationId, ctx.organizationId),
      isNull(attachments.deletedAt),
    ];

    if (data.entityType) {
      conditions.push(eq(attachments.entityType, data.entityType));
    }

    if (data.entityId) {
      conditions.push(eq(attachments.entityId, data.entityId));
    }

    // Get attachments
    const results = await db
      .select({
        id: attachments.id,
        filename: attachments.filename,
        originalFilename: attachments.originalFilename,
        mimeType: attachments.mimeType,
        sizeBytes: attachments.sizeBytes,
        entityType: attachments.entityType,
        entityId: attachments.entityId,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(and(...conditions))
      .orderBy(attachments.createdAt)
      .limit(data.limit)
      .offset(data.offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(attachments)
      .where(and(...conditions));

    return {
      attachments: results.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      total: countResult?.count ?? 0,
    };
  });

// ============================================================================
// DELETE FUNCTIONS
// ============================================================================

/**
 * Soft delete an attachment.
 *
 * Sets deletedAt but preserves the file in R2 for recovery.
 *
 * Required: Authentication
 */
export const deleteAttachment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (typeof input !== "object" || input === null) {
      throw new Error("Invalid input");
    }
    const { attachmentId } = input as { attachmentId?: string };
    if (!attachmentId || typeof attachmentId !== "string") {
      throw new Error("attachmentId is required");
    }
    return { attachmentId };
  })
  .handler(async ({ data }): Promise<DeleteAttachmentResponse> => {
    const ctx = await withAuth();

    // Verify attachment exists and belongs to org
    const [attachment] = await db
      .select({ id: attachments.id })
      .from(attachments)
      .where(
        and(
          eq(attachments.id, data.attachmentId),
          eq(attachments.organizationId, ctx.organizationId),
          isNull(attachments.deletedAt)
        )
      )
      .limit(1);

    if (!attachment) {
      throw new NotFoundError("Attachment not found");
    }

    // Soft delete
    await db
      .update(attachments)
      .set({ deletedAt: new Date() })
      .where(eq(attachments.id, data.attachmentId));

    return { success: true };
  });

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Get presigned download URLs for multiple attachments in a single request.
 *
 * This is a performance optimization to avoid N+1 API calls when rendering
 * attachment lists. Fetches all attachments in one query, then generates
 * presigned URLs in parallel.
 *
 * Required: Authentication, attachments must belong to user's org
 * Max: 50 attachments per request
 */
export const getPresignedDownloadUrls = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      attachmentIds: z.array(z.string().uuid()).min(1).max(50),
    })
  )
  .handler(async ({ data }): Promise<Record<string, string>> => {
    const ctx = await withAuth();

    // Fetch all attachments in one query
    const attachmentList = await db
      .select({
        id: attachments.id,
        storageKey: attachments.storageKey,
      })
      .from(attachments)
      .where(
        and(
          inArray(attachments.id, data.attachmentIds),
          eq(attachments.organizationId, ctx.organizationId),
          isNull(attachments.deletedAt)
        )
      );

    // Generate URLs in parallel
    const results: Record<string, string> = {};
    await Promise.all(
      attachmentList.map(async (att) => {
        const { downloadUrl } = await generatePresignedDownloadUrl({
          key: att.storageKey,
        });
        results[att.id] = downloadUrl;
      })
    );

    return results;
  });
