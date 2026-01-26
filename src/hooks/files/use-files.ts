/**
 * File Hooks
 *
 * TanStack Query hooks for file upload, download, and management.
 *
 * @example
 * ```tsx
 * // List attachments for an entity
 * const { data, isLoading } = useAttachments('customer', customerId);
 *
 * // Upload a file
 * const upload = useUploadFile();
 * await upload.mutateAsync({ file, entityType: 'customer', entityId });
 *
 * // Download a file
 * const { downloadUrl } = useDownloadUrl(attachmentId);
 *
 * // Delete a file
 * const deleteFile = useDeleteFile();
 * await deleteFile.mutateAsync(attachmentId);
 * ```
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getPresignedUploadUrl,
  confirmUpload,
  getPresignedDownloadUrl,
  getPresignedDownloadUrls,
  listAttachments,
  deleteAttachment,
} from '@/lib/server/files';
import type {
  ConfirmUploadResponse,
  PresignedDownloadResponse,
  ListAttachmentsResponse,
  DeleteAttachmentResponse,
} from '@/lib/schemas/files';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAttachmentsResult {
  attachments: ListAttachmentsResponse['attachments'];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseUploadFileOptions {
  entityType?: string;
  entityId?: string;
  onProgress?: (progress: number) => void;
}

export interface UploadFileInput {
  file: File;
  entityType?: string;
  entityId?: string;
  onProgress?: (progress: number) => void;
}

// ============================================================================
// LIST HOOK
// ============================================================================

/**
 * Fetch attachments for an entity or the entire organization.
 *
 * @param entityType - Filter by entity type (e.g., 'customer', 'order')
 * @param entityId - Filter by entity ID
 * @param options - Additional query options
 */
export function useAttachments(
  entityType?: string,
  entityId?: string,
  options?: { limit?: number; offset?: number }
): UseQueryResult<ListAttachmentsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.files.list(entityType ?? '', entityId ?? ''),
    queryFn: () =>
      listAttachments({
        data: {
          ...(entityType && { entityType }),
          ...(entityId && { entityId }),
          limit: options?.limit ?? 50,
          offset: options?.offset ?? 0,
        },
      }),
    enabled: true,
  });
}

// ============================================================================
// DOWNLOAD HOOK
// ============================================================================

/**
 * Get a presigned download URL for an attachment.
 *
 * URLs are cached for 5 minutes to reduce API calls.
 *
 * @param attachmentId - The attachment ID to download
 */
export function useDownloadUrl(
  attachmentId: string | undefined
): UseQueryResult<PresignedDownloadResponse, Error> {
  return useQuery({
    queryKey: queryKeys.files.download(attachmentId ?? ''),
    queryFn: () => getPresignedDownloadUrl({ data: { attachmentId: attachmentId! } }),
    enabled: !!attachmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache presigned URLs
  });
}

/**
 * Get presigned download URLs for multiple attachments in a single request.
 *
 * This is a performance optimization to avoid N+1 API calls when rendering
 * attachment lists. All URLs are fetched in a single request.
 *
 * @param attachmentIds - Array of attachment IDs to get download URLs for
 */
export function useDownloadUrls(
  attachmentIds: string[]
): UseQueryResult<Record<string, string>, Error> {
  return useQuery({
    queryKey: queryKeys.files.downloads(attachmentIds),
    queryFn: () => getPresignedDownloadUrls({ data: { attachmentIds } }),
    enabled: attachmentIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache presigned URLs
  });
}

// ============================================================================
// UPLOAD HOOK
// ============================================================================

/**
 * Upload a file to R2.
 *
 * Handles the full upload flow:
 * 1. Get presigned URL
 * 2. Upload directly to R2 via XHR (for progress tracking)
 * 3. Confirm upload
 *
 * @returns Mutation for uploading files
 */
export function useUploadFile(): UseMutationResult<ConfirmUploadResponse, Error, UploadFileInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadFileInput): Promise<ConfirmUploadResponse> => {
      const { file, entityType, entityId, onProgress } = input;

      // Step 1: Get presigned upload URL
      const presignedResponse = await getPresignedUploadUrl({
        data: {
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          entityType,
          entityId,
        },
      });

      // Step 2: Upload to R2 via XHR with retry (for progress tracking)
      await uploadWithRetry(presignedResponse.uploadUrl, file, onProgress);

      // Step 3: Confirm upload
      const confirmResponse = await confirmUpload({
        data: { attachmentId: presignedResponse.attachmentId },
      });

      return confirmResponse;
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.files.lists() });
      if (variables.entityType && variables.entityId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.files.list(variables.entityType, variables.entityId),
        });
      }
    },
  });
}

/** Default upload timeout: 5 minutes for large files */
const DEFAULT_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Upload file to R2 using XHR for progress tracking.
 *
 * @param uploadUrl - Presigned PUT URL
 * @param file - File to upload
 * @param onProgress - Progress callback (0-100)
 * @param timeoutMs - Timeout in milliseconds (default: 5 minutes)
 */
async function uploadToR2(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void,
  timeoutMs: number = DEFAULT_UPLOAD_TIMEOUT_MS
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Set timeout for large file uploads
    xhr.timeout = timeoutMs;

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'));
    });

    xhr.addEventListener('timeout', () => {
      reject(
        new Error(
          `Upload timed out after ${Math.round(timeoutMs / 1000)} seconds. Try uploading a smaller file or check your connection.`
        )
      );
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}

/** Default retry attempts for upload */
const DEFAULT_RETRY_ATTEMPTS = 3;

/**
 * Upload with automatic retry on transient failures.
 *
 * Uses exponential backoff: 1s, 2s, 4s between attempts.
 * Does not retry non-recoverable errors (e.g., file type validation).
 */
async function uploadWithRetry(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void,
  maxAttempts: number = DEFAULT_RETRY_ATTEMPTS,
  timeoutMs?: number
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await uploadToR2(uploadUrl, file, onProgress, timeoutMs);
      return; // Success
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Upload failed');

      // Don't retry on non-recoverable errors
      const nonRecoverablePatterns = [
        'File type not allowed',
        'status 400',
        'status 403',
        'status 401',
      ];
      if (nonRecoverablePatterns.some((p) => lastError!.message.includes(p))) {
        throw lastError;
      }

      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        onProgress?.(0); // Reset progress for retry
      }
    }
  }

  // All retries exhausted
  throw new Error(
    `Upload failed after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

// ============================================================================
// DELETE HOOK
// ============================================================================

/**
 * Delete (soft delete) an attachment.
 *
 * @returns Mutation for deleting files
 */
export function useDeleteFile(): UseMutationResult<DeleteAttachmentResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment({ data: { attachmentId } }),
    onSuccess: (_data, attachmentId) => {
      // Scope invalidation: find which list contained this attachment
      const queries = queryClient.getQueriesData<ListAttachmentsResponse>({
        queryKey: queryKeys.files.lists(),
      });

      // Find which entity list this attachment belonged to
      for (const [queryKey, data] of queries) {
        if (data?.attachments?.some((a) => a.id === attachmentId)) {
          queryClient.invalidateQueries({ queryKey });
          // Also invalidate the download URL for this attachment
          queryClient.invalidateQueries({
            queryKey: queryKeys.files.download(attachmentId),
          });
          return;
        }
      }

      // Fallback: invalidate all lists if attachment not found in cache
      queryClient.invalidateQueries({ queryKey: queryKeys.files.lists() });
    },
  });
}
