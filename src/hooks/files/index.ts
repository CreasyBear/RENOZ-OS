/**
 * File Hooks
 *
 * Provides hooks for file uploads, downloads, and attachment management.
 */

// File operations
export {
  useAttachments,
  useDownloadUrl,
  useDownloadUrls,
  useUploadFile,
  useDeleteFile,
} from './use-files';

// Re-export types
export type { ListAttachmentsResponse, DeleteAttachmentResponse } from '@/lib/schemas/files';
