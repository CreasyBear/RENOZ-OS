/**
 * File Upload Zod Schemas
 *
 * Validation schemas for file upload and attachment operations.
 *
 * @see drizzle/schema/files/attachments.ts for database schema
 * @see src/lib/server/files.ts for server functions
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum file size in bytes (50 MB)
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Allowed MIME types for upload
 */
export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text (explicit safe types only - NO html/javascript)
  'text/plain',
  'text/csv',
  'text/markdown',
] as const;

/**
 * Blocked MIME types (security risk - can execute code)
 */
export const BLOCKED_MIME_TYPES = [
  'text/javascript',
  'text/html',
  'text/xml',
  'application/javascript',
  'application/x-javascript',
  'application/xhtml+xml',
] as const;

/**
 * MIME type patterns (for broader matching)
 * Note: Patterns are more restrictive to prevent executable content
 */
export const ALLOWED_MIME_PATTERNS = [
  /^image\/(jpeg|png|gif|webp|svg\+xml|bmp|tiff)$/, // Explicit image types
  /^text\/(plain|csv|markdown|tab-separated-values)$/, // Explicit safe text types
  /^application\/pdf$/,
  /^application\/msword$/,
  /^application\/vnd\.openxmlformats-.+$/,
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
  // First, check blocklist (security: reject known dangerous types)
  if ((BLOCKED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return false;
  }

  // Check exact matches in allowlist
  if ((ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return true;
  }

  // Check patterns
  return ALLOWED_MIME_PATTERNS.some((pattern) => pattern.test(mimeType));
}

// ============================================================================
// PRESIGNED UPLOAD SCHEMAS
// ============================================================================

/**
 * Schema for requesting a presigned upload URL
 */
export const presignedUploadRequestSchema = z.object({
  /** Original filename for display */
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be 255 characters or less'),

  /** MIME type of the file */
  mimeType: z.string().min(1, 'MIME type is required').refine(isAllowedMimeType, {
    message: 'File type not allowed',
  }),

  /** File size in bytes */
  sizeBytes: z
    .number()
    .int()
    .positive('File size must be positive')
    .max(MAX_FILE_SIZE_BYTES, `File size must be ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB or less`),

  /** Entity type for association (e.g., 'customer', 'order') */
  entityType: z.string().max(50).optional(),

  /** Entity ID for association */
  entityId: z.string().uuid().optional(),
});

export type PresignedUploadRequest = z.infer<typeof presignedUploadRequestSchema>;

/**
 * Response schema for presigned upload URL
 */
export const presignedUploadResponseSchema = z.object({
  /** Presigned PUT URL for uploading to R2 */
  uploadUrl: z.string().url(),

  /** Attachment ID to use for confirmation */
  attachmentId: z.string().uuid(),

  /** URL expiration timestamp */
  expiresAt: z.string().datetime(),
});

export type PresignedUploadResponse = z.infer<typeof presignedUploadResponseSchema>;

// ============================================================================
// CONFIRM UPLOAD SCHEMAS
// ============================================================================

/**
 * Schema for confirming an upload
 */
export const confirmUploadRequestSchema = z.object({
  /** Attachment ID from presigned response */
  attachmentId: z.string().uuid('Invalid attachment ID'),
});

export type ConfirmUploadRequest = z.infer<typeof confirmUploadRequestSchema>;

/**
 * Response schema for confirm upload
 */
export const confirmUploadResponseSchema = z.object({
  /** Full attachment record */
  attachment: z.object({
    id: z.string().uuid(),
    filename: z.string(),
    originalFilename: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
    entityType: z.string().nullable(),
    entityId: z.string().nullable(),
    createdAt: z.string().datetime(),
  }),
});

export type ConfirmUploadResponse = z.infer<typeof confirmUploadResponseSchema>;

// ============================================================================
// DOWNLOAD SCHEMAS
// ============================================================================

/**
 * Response schema for presigned download URL
 */
export const presignedDownloadResponseSchema = z.object({
  /** Presigned GET URL for downloading from R2 */
  downloadUrl: z.string().url(),

  /** Original filename for Content-Disposition */
  filename: z.string(),

  /** URL expiration timestamp */
  expiresAt: z.string().datetime(),

  /** MIME type for client-side handling */
  mimeType: z.string(),

  /** File size in bytes */
  sizeBytes: z.number(),
});

export type PresignedDownloadResponse = z.infer<typeof presignedDownloadResponseSchema>;

// ============================================================================
// LIST SCHEMAS
// ============================================================================

/**
 * Query params for listing attachments
 */
export const listAttachmentsQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListAttachmentsQuery = z.infer<typeof listAttachmentsQuerySchema>;

/**
 * Response schema for attachment list
 */
export const listAttachmentsResponseSchema = z.object({
  attachments: z.array(
    z.object({
      id: z.string().uuid(),
      filename: z.string(),
      originalFilename: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number(),
      entityType: z.string().nullable(),
      entityId: z.string().nullable(),
      createdAt: z.string().datetime(),
    })
  ),
  total: z.number().int(),
});

export type ListAttachmentsResponse = z.infer<typeof listAttachmentsResponseSchema>;

// ============================================================================
// DELETE SCHEMAS
// ============================================================================

/**
 * Response schema for delete operation
 */
export const deleteAttachmentResponseSchema = z.object({
  success: z.boolean(),
});

export type DeleteAttachmentResponse = z.infer<typeof deleteAttachmentResponseSchema>;

// ============================================================================
// ATTACHMENT INFO TYPE (for UI components)
// ============================================================================

/**
 * Attachment info as returned by the API.
 * This is a subset of the full database Attachment type.
 */
export const attachmentInfoSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  originalFilename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type AttachmentInfo = z.infer<typeof attachmentInfoSchema>;
