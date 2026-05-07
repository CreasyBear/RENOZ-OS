'use server';

/**
 * Server action for uploading project files.
 *
 * Authenticates and scopes @/lib/storage uploadFile to the selected project.
 * Prevents process.env from being bundled into client when file-dialogs
 * triggers uploads.
 *
 * @see src/components/domain/jobs/projects/file-dialogs.tsx
 */
import { randomUUID } from 'node:crypto';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  buildProjectFileStoragePath,
  isProjectFileStoragePathForProject,
  PROJECT_FILE_STORAGE_BUCKET,
} from '@/lib/jobs/project-file-storage';
import { withAuth } from '@/lib/server/protected';
import { deleteFile, uploadFile } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { verifyProjectExists } from '@/server/functions/_shared/entity-verification';
import type { UploadFileResult } from '@/lib/storage';

export async function uploadProjectFile(params: {
  projectId: string;
  filename: string;
  fileBody: File;
  contentType: string;
}): Promise<UploadFileResult> {
  const ctx = await withAuth({ permission: PERMISSIONS.job.create });
  await verifyProjectExists(params.projectId, ctx.organizationId);

  const storagePath = buildProjectFileStoragePath({
    organizationId: ctx.organizationId,
    projectId: params.projectId,
    objectId: randomUUID(),
    filename: params.filename,
  });

  return uploadFile({
    path: storagePath,
    fileBody: params.fileBody,
    contentType: params.contentType,
    bucket: PROJECT_FILE_STORAGE_BUCKET,
    metadata: {
      organizationId: ctx.organizationId,
      projectId: params.projectId,
      originalFilename: params.filename,
    },
    upsert: false,
  });
}

export async function discardUploadedProjectFile(params: {
  projectId: string;
  path: string;
  bucket: string;
}): Promise<{ success: boolean }> {
  try {
    const ctx = await withAuth({ permission: PERMISSIONS.job.create });
    await verifyProjectExists(params.projectId, ctx.organizationId);

    const ownsPath =
      params.bucket === PROJECT_FILE_STORAGE_BUCKET &&
      isProjectFileStoragePathForProject({
        storagePath: params.path,
        organizationId: ctx.organizationId,
        projectId: params.projectId,
      });

    if (!ownsPath) {
      logger.warn('Rejected project file upload rollback for unowned storage path', {
        projectId: params.projectId,
        bucket: params.bucket,
      });
      return { success: false };
    }

    await deleteFile({
      path: params.path,
      bucket: PROJECT_FILE_STORAGE_BUCKET,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to discard uploaded project file', error, {
      projectId: params.projectId,
    });
    return { success: false };
  }
}
