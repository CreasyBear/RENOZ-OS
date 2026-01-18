/**
 * Storage Utilities
 *
 * Cloudflare R2 storage operations for file management.
 *
 * @example
 * ```typescript
 * import {
 *   generatePresignedUploadUrl,
 *   generatePresignedDownloadUrl,
 *   deleteObject,
 *   headObject,
 *   StorageError,
 * } from "~/lib/storage";
 *
 * // Generate upload URL
 * const { uploadUrl } = await generatePresignedUploadUrl({
 *   key: "org-123/general/photo.jpg",
 *   mimeType: "image/jpeg",
 * });
 *
 * // Check if file exists
 * const exists = await headObject({ key: "org-123/general/photo.jpg" });
 *
 * // Generate download URL
 * const { downloadUrl } = await generatePresignedDownloadUrl({
 *   key: "org-123/general/photo.jpg",
 * });
 *
 * // Delete file
 * await deleteObject({ key: "org-123/general/photo.jpg" });
 * ```
 */

// Client
export { getR2Client, getDefaultBucket, resetR2Client } from "./r2-client";

// Operations
export {
  generatePresignedUploadUrl,
  type GeneratePresignedUploadUrlOptions,
  type PresignedUploadUrlResult,
} from "./upload";

export {
  generatePresignedDownloadUrl,
  type GeneratePresignedDownloadUrlOptions,
  type PresignedDownloadUrlResult,
} from "./download";

export { deleteObject, type DeleteObjectOptions } from "./delete";

export {
  headObject,
  type HeadObjectOptions,
  type HeadObjectResult,
} from "./head";

// Errors
export {
  StorageError,
  StorageNotFoundError,
  StorageAccessDeniedError,
  StorageOperationError,
  StorageConfigError,
} from "./errors";
