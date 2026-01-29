/**
 * Server Functions - Files
 *
 * File upload and management server functions.
 *
 * Note: This module uses Supabase Storage.
 * The legacy R2 implementation has been removed.
 */

export {
  // Upload
  getPresignedUploadUrl,
  confirmUpload,
  uploadFileServer,
  // Download
  getPresignedDownloadUrl,
  getPresignedDownloadUrls,
  getTransformedImageUrl,
  // List
  listAttachments,
  // Delete
  deleteAttachment,
  bulkDeleteAttachments,
} from '@/server/functions/files/files-supabase'
