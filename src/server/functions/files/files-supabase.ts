/**
 * File Upload Server Functions - Supabase Storage Implementation
 *
 * Server-side operations for file upload, download, and management using
 * Supabase Storage instead of R2/S3.
 *
 * Key improvements over R2 implementation:
 * - Better buffer handling (no S3 SDK buffer issues)
 * - Native Supabase Auth integration
 * - Simpler API (no presigned URLs needed for server-side)
 * - Built-in image transformations
 *
 * Upload flow:
 * 1. Client calls getUploadUrl (returns signed URL for direct browser upload)
 * 2. Client uploads directly to Supabase Storage
 * 3. Client confirms upload (creates attachment record)
 *
 * Alternative server-side upload flow:
 * 1. Client sends file to server
 * 2. Server uploads to Supabase Storage via uploadFileServer
 * 3. Server creates attachment record
 *
 * @see drizzle/schema/files/attachments.ts for database schema
 * @see src/lib/schemas/files/files.ts for Zod schemas
 * @see src/lib/storage/supabase-storage.ts for storage client
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, isNull, isNotNull, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { attachments } from "../../../../drizzle/schema/files";
import { withAuth } from "@/lib/server/protected";
import { NotFoundError, ValidationError } from "@/lib/server/errors";
import {
  createSignedUrl,
  createSignedUrls,
  uploadFile,
  deleteFile,
  getFileMetadata,
} from "@/lib/storage";
import { logger } from "@/lib/logger";
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

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default bucket for file storage */
const DEFAULT_BUCKET = "attachments";

/** Default URL expiration: 1 hour */
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

/** Storage key format: {orgId}/{entityType}/{uuid}-{sanitized-filename} */
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

/** Sanitize filename for safe storage */
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

/**
 * Get a signed URL for uploading a file directly to Supabase Storage.
 *
 * Creates a pending attachment record (with deletedAt set) that will be
 * confirmed after successful upload.
 *
 * Required: Authentication
 *
 * @see src/hooks/files/use-files.ts for client-side upload implementation
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

    // Create signed upload URL (Supabase Storage equivalent of S3 presigned URL)
    const { signedUrl, expiresAt } = await createSignedUrl({
      path: storageKey,
      bucket: DEFAULT_BUCKET,
      expiresIn: DEFAULT_EXPIRES_IN_SECONDS,
    });

    return {
      uploadUrl: signedUrl,
      attachmentId: attachment.id,
      expiresAt: expiresAt.toISOString(),
    };
  });

/**
 * Confirm that an upload completed successfully.
 *
 * Verifies the file exists in Supabase Storage and clears the deletedAt marker.
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

    // Verify file exists in Supabase Storage
    let fileInfo;
    try {
      fileInfo = await getFileMetadata({
        path: attachment.storageKey,
        bucket: DEFAULT_BUCKET,
      });
    } catch {
      // File doesn't exist or other error
      throw new NotFoundError(
        "File not found in storage. Upload may have failed or is still processing."
      );
    }

    // Verify actual content type matches claimed type (server-side security check)
    const actualMimeType = fileInfo.mimeType;
    if (actualMimeType && actualMimeType !== attachment.mimeType) {
      logger.warn('MIME type mismatch', {
        claimed: attachment.mimeType,
        actual: actualMimeType,
        attachmentId: data.attachmentId,
      });

      // If actual type is not allowed, reject the upload entirely
      if (!isAllowedMimeType(actualMimeType)) {
        // Delete the malicious file from Supabase Storage
        await deleteFile({
          path: attachment.storageKey,
          bucket: DEFAULT_BUCKET,
        });
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

    // Update size if it differs from what client claimed
    if (fileInfo.size !== attachment.sizeBytes) {
      await db
        .update(attachments)
        .set({ sizeBytes: fileInfo.size })
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
        id: confirmed.id,
        filename: confirmed.filename,
        originalFilename: confirmed.originalFilename,
        mimeType: confirmed.mimeType,
        sizeBytes: confirmed.sizeBytes,
        entityType: confirmed.entityType,
        entityId: confirmed.entityId,
        createdAt: confirmed.createdAt.toISOString(),
      },
    };
  });

/**
 * Server-side file upload for background jobs or server-generated files.
 *
 * This uploads directly from server to Supabase Storage without client involvement.
 * Use cases: PDF generation, report exports, import processing results.
 *
 * Required: Authentication with appropriate permission
 */
export const uploadFileServer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      /** Base64-encoded file content */
      base64Content: z.string(),
      filename: z.string().min(1),
      mimeType: z.string().min(1),
      entityType: z.string().optional(),
      entityId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Decode base64 to ArrayBuffer
    const binaryString = atob(data.base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate storage key
    const storageKey = generateStorageKey(
      ctx.organizationId,
      data.entityType,
      data.filename
    );

    // Upload to Supabase Storage
    const uploadResult = await uploadFile({
      path: storageKey,
      fileBody: bytes.buffer,
      contentType: data.mimeType,
      bucket: DEFAULT_BUCKET,
    });

    // Create attachment record
    const [attachment] = await db
      .insert(attachments)
      .values({
        organizationId: ctx.organizationId,
        uploadedBy: ctx.user.id,
        filename: sanitizeFilename(data.filename),
        originalFilename: data.filename,
        mimeType: data.mimeType,
        sizeBytes: bytes.length,
        storageKey,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        deletedAt: null, // Already confirmed since server uploaded
      })
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
        id: attachment.id,
        filename: attachment.filename,
        originalFilename: attachment.originalFilename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        entityType: attachment.entityType,
        entityId: attachment.entityId,
        createdAt: attachment.createdAt.toISOString(),
      },
      publicUrl: uploadResult.publicUrl,
    };
  });

// ============================================================================
// DOWNLOAD FUNCTIONS
// ============================================================================

/**
 * Get a signed download URL for a single attachment.
 *
 * Creates a temporary signed URL for accessing private files.
 * URLs expire after 1 hour by default.
 */
export const getPresignedDownloadUrl = createServerFn({ method: "GET" })
  .inputValidator(z.object({ attachmentId: z.string().uuid() }))
  .handler(async ({ data }): Promise<PresignedDownloadResponse> => {
    const ctx = await withAuth();

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

    const { signedUrl, expiresAt } = await createSignedUrl({
      path: attachment.storageKey,
      bucket: DEFAULT_BUCKET,
      expiresIn: DEFAULT_EXPIRES_IN_SECONDS,
    });

    return {
      downloadUrl: signedUrl,
      expiresAt: expiresAt.toISOString(),
      filename: attachment.originalFilename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    };
  });

/**
 * Get signed download URLs for multiple attachments.
 * This avoids N+1 API calls when rendering lists.
 */
export const getPresignedDownloadUrls = createServerFn({ method: "POST" })
  .inputValidator(z.object({ attachmentIds: z.array(z.string().uuid()) }))
  .handler(async ({ data }): Promise<Record<string, string>> => {
    const ctx = await withAuth();

    if (data.attachmentIds.length === 0) {
      return {};
    }

    const results = await db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.organizationId, ctx.organizationId),
          isNull(attachments.deletedAt),
          inArray(attachments.id, data.attachmentIds)
        )
      );

    // Create signed URLs in batch
    const storagePaths = results.map((a) => a.storageKey);
    const signedUrls = await createSignedUrls({
      paths: storagePaths,
      bucket: DEFAULT_BUCKET,
      expiresIn: DEFAULT_EXPIRES_IN_SECONDS,
    });

    // Map attachment IDs to signed URLs
    const urls: Record<string, string> = {};
    for (const attachment of results) {
      const signedUrl = signedUrls[attachment.storageKey];
      if (signedUrl) {
        urls[attachment.id] = signedUrl.signedUrl;
      }
    }

    return urls;
  });

/**
 * Get a signed URL for an image with transformations.
 *
 * This allows on-the-fly image resizing without storing multiple versions.
 * Requires Supabase Storage Image Transformations to be enabled.
 */
export const getTransformedImageUrl = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      attachmentId: z.string().uuid(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      resize: z.enum(["cover", "contain", "fill"]).optional(),
      format: z.enum(["origin"]).optional(),
      quality: z.number().int().min(1).max(100).optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

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

    // Only allow transformations on images
    if (!attachment.mimeType.startsWith("image/")) {
      throw new ValidationError("Transformations only available for images", {
        attachmentId: ["File is not an image"],
      });
    }

    const { signedUrl, expiresAt } = await createSignedUrl({
      path: attachment.storageKey,
      bucket: DEFAULT_BUCKET,
      expiresIn: DEFAULT_EXPIRES_IN_SECONDS,
      transform: {
        width: data.width,
        height: data.height,
        resize: data.resize,
        format: data.format,
        quality: data.quality,
      },
    });

    return {
      url: signedUrl,
      expiresAt: expiresAt.toISOString(),
    };
  });

// ============================================================================
// LIST FUNCTIONS
// ============================================================================

/**
 * List attachments for an entity or organization.
 */
export const listAttachments = createServerFn({ method: "GET" })
  .inputValidator(listAttachmentsQuerySchema)
  .handler(async ({ data }): Promise<ListAttachmentsResponse> => {
    const ctx = await withAuth();

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

    const attachmentsList = await db
      .select()
      .from(attachments)
      .where(and(...conditions))
      .orderBy(attachments.createdAt)
      .limit(data.limit)
      .offset(data.offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attachments)
      .where(and(...conditions));

    return {
      attachments: attachmentsList.map((attachment) => ({
        id: attachment.id,
        filename: attachment.filename,
        originalFilename: attachment.originalFilename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        entityType: attachment.entityType,
        entityId: attachment.entityId,
        createdAt: attachment.createdAt.toISOString(),
      })),
      total: Number(countResult?.count ?? 0),
    };
  });

// ============================================================================
// DELETE FUNCTIONS
// ============================================================================

/**
 * Delete an attachment.
 * Removes the file from Supabase Storage and marks the record as deleted.
 */
export const deleteAttachment = createServerFn({ method: "POST" })
  .inputValidator(z.object({ attachmentId: z.string().uuid() }))
  .handler(async ({ data }): Promise<DeleteAttachmentResponse> => {
    const ctx = await withAuth();

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

    // Delete from Supabase Storage (idempotent - safe to retry)
    try {
      await deleteFile({
        path: attachment.storageKey,
        bucket: DEFAULT_BUCKET,
      });
    } catch (error) {
      logger.warn('Failed to delete file from storage (may already be deleted)', {
        error: String(error),
        attachmentId: data.attachmentId,
      });
    }

    // Soft delete the record
    await db
      .update(attachments)
      .set({ deletedAt: new Date() })
      .where(eq(attachments.id, data.attachmentId));

    return { success: true };
  });

/**
 * Bulk delete attachments.
 * More efficient than calling deleteAttachment multiple times.
 */
export const bulkDeleteAttachments = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      attachmentIds: z.array(z.string().uuid()).min(1).max(100),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const results = await db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.organizationId, ctx.organizationId),
          isNull(attachments.deletedAt),
          inArray(attachments.id, data.attachmentIds)
        )
      );

    if (results.length === 0) {
      return { deleted: 0, failed: 0 };
    }

    // Delete files from storage in parallel
    await Promise.all(
      results.map(async (attachment) => {
        try {
          await deleteFile({
            path: attachment.storageKey,
            bucket: DEFAULT_BUCKET,
          });
        } catch (error) {
          logger.warn('Failed to delete file from storage', {
            storageKey: attachment.storageKey,
            error: String(error),
          });
        }
      })
    );

    // Soft delete all records
    await db
      .update(attachments)
      .set({ deletedAt: new Date() })
      .where(
        inArray(
          attachments.id,
          results.map((r) => r.id)
        )
      );

    return {
      deleted: results.length,
      failed: data.attachmentIds.length - results.length,
    };
  });
