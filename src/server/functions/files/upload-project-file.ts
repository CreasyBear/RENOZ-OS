'use server';

/**
 * Server action for uploading project files.
 *
 * Wraps @/lib/storage uploadFile to keep storage module server-only.
 * Prevents process.env from being bundled into client when file-dialogs
 * triggers uploads.
 *
 * @see src/components/domain/jobs/projects/file-dialogs.tsx
 */
import { uploadFile } from '@/lib/storage';
import type { UploadFileResult } from '@/lib/storage';

export async function uploadProjectFile(params: {
  path: string;
  fileBody: File;
  contentType: string;
}): Promise<UploadFileResult> {
  return uploadFile({
    path: params.path,
    fileBody: params.fileBody,
    contentType: params.contentType,
  });
}
