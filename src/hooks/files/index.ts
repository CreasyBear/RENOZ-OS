/**
 * File Hooks
 *
 * Provides hooks for file uploads, downloads, and attachment management.
 *
 * Note: This module uses Supabase Storage.
 * The legacy R2 implementation has been removed.
 *
 * @example
 * ```tsx
 * import {
 *   useAttachments,
 *   useUploadFile,
 *   useDownloadUrl,
 *   useDeleteFile,
 * } from '@/hooks/files';
 *
 * // Upload
 * const upload = useUploadFile();
 * await upload.mutateAsync({
 *   file,
 *   entityType: 'customer',
 *   entityId: customerId,
 * });
 *
 * // List
 * const { data } = useAttachments('customer', customerId);
 *
 * // Download
 * const { data } = useDownloadUrl(attachmentId);
 *
 * // Delete
 * const deleteFile = useDeleteFile();
 * await deleteFile.mutateAsync(attachmentId);
 * ```
 */

// ============================================================================
// SUPABASE STORAGE
// ============================================================================

export {
  // List
  useAttachments,
  // Download
  useDownloadUrl,
  useDownloadUrls,
  useTransformedImageUrl,
  // Upload
  useUploadFile,
  // Delete
  useDeleteFile,
  useBulkDeleteFiles,
} from './use-files-supabase';

// Re-export types
export type {
  UseAttachmentsResult,
  UseUploadFileOptions,
  UploadFileInput,
  ImageTransformOptions,
} from './use-files-supabase';

// ============================================================================
// SHARED TYPES (from schemas)
// ============================================================================

export type {
  ListAttachmentsResponse,
  DeleteAttachmentResponse,
  PresignedUploadResponse,
  ConfirmUploadResponse,
  PresignedDownloadResponse,
} from '@/lib/schemas/files';
