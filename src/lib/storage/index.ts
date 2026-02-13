/**
 * Storage Utilities
 *
 * Supabase Storage operations for file management.
 *
 * Note: The legacy R2/S3 implementation has been removed.
 * All storage operations now use Supabase Storage.
 *
 * @example
 * ```typescript
 * import {
 *   uploadFile,
 *   createSignedUrl,
 *   deleteFile,
 * } from "@/lib/storage";
 *
 * // Upload
 * const { path, publicUrl } = await uploadFile({
 *   path: "org-123/general/photo.jpg",
 *   fileBody: fileBuffer,
 *   contentType: "image/jpeg",
 * });
 *
 * // Create signed URL
 * const { signedUrl } = await createSignedUrl({
 *   path: "org-123/private/document.pdf",
 *   expiresIn: 3600,
 * });
 *
 * // Delete
 * await deleteFile({ path: "org-123/general/photo.jpg" });
 * ```
 */

// ============================================================================
// SUPABASE STORAGE
// ============================================================================

export { createStorageClient } from "./supabase-storage";

// Upload
export {
  uploadFile,
  type UploadFileOptions,
  type UploadFileResult,
} from "./supabase-storage";

// Download
export {
  downloadFile,
  type DownloadFileOptions,
  type DownloadFileResult,
} from "./supabase-storage";

// URL Generation
export {
  createSignedUrl,
  createSignedUrls,
  getPublicUrl,
  type CreateSignedUrlOptions,
  type SignedUrlResult,
} from "./supabase-storage";

// Metadata
export { getFileMetadata } from "./supabase-storage";

// Delete
export { deleteFile, deleteFiles } from "./supabase-storage";

// List
export { listFiles } from "./supabase-storage";

// Admin
export { ensureBucket } from "./supabase-storage";

// ============================================================================
// URL UTILITIES
// ============================================================================

export {
  isOurStorageUrl,
  extractStoragePathFromPublicUrl,
} from "./storage-url-utils";

// ============================================================================
// ERRORS
// ============================================================================

export {
  StorageError,
  StorageNotFoundError,
  StorageAccessDeniedError,
  StorageOperationError,
  StorageConfigError,
} from "./errors";
