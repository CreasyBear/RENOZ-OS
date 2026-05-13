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
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  buildProjectFileStoragePath,
  isProjectFileStoragePathForProject,
  PROJECT_FILE_STORAGE_BUCKET,
} from '@/lib/jobs/project-file-storage';
import { withAuth } from '@/lib/server/protected';
import { ValidationError } from '@/lib/server/errors';
import { deleteFile, uploadFile } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { verifyProjectExists } from '@/server/functions/_shared/entity-verification';
import type { UploadFileResult } from '@/lib/storage';

const MAX_PROJECT_FILE_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

const uploadProjectFileInputSchema = z.object({
  projectId: z.string().min(1),
  filename: z.string().min(1).max(255),
  base64Content: z.string().min(1),
  contentType: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive().max(MAX_PROJECT_FILE_UPLOAD_SIZE_BYTES),
});

const discardUploadedProjectFileInputSchema = z.object({
  projectId: z.string().min(1),
  path: z.string().min(1),
  bucket: z.string().min(1),
});

function createStorageObjectId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function decodeProjectFileBase64Content(
  base64Content: string,
  expectedSizeBytes: number
): ArrayBuffer {
  const buffer = Buffer.from(base64Content, 'base64');

  if (buffer.byteLength !== expectedSizeBytes) {
    throw new ValidationError('Uploaded file could not be read. Please choose the file again.', {
      file: ['Uploaded file could not be read.'],
    });
  }

  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export const uploadProjectFile = createServerFn({ method: 'POST' })
  .inputValidator(uploadProjectFileInputSchema)
  .handler(async ({ data }): Promise<UploadFileResult> => {
  const ctx = await withAuth({ permission: PERMISSIONS.job.create });
  await verifyProjectExists(data.projectId, ctx.organizationId);

  const storagePath = buildProjectFileStoragePath({
    organizationId: ctx.organizationId,
    projectId: data.projectId,
    objectId: createStorageObjectId(),
    filename: data.filename,
  });

  const fileBody = decodeProjectFileBase64Content(data.base64Content, data.sizeBytes);

  return uploadFile({
    path: storagePath,
    fileBody,
    contentType: data.contentType,
    bucket: PROJECT_FILE_STORAGE_BUCKET,
    metadata: {
      organizationId: ctx.organizationId,
      projectId: data.projectId,
      originalFilename: data.filename,
    },
    upsert: false,
  });
});

export const discardUploadedProjectFile = createServerFn({ method: 'POST' })
  .inputValidator(discardUploadedProjectFileInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
  try {
    const ctx = await withAuth({ permission: PERMISSIONS.job.create });
    await verifyProjectExists(data.projectId, ctx.organizationId);

    const ownsPath =
      data.bucket === PROJECT_FILE_STORAGE_BUCKET &&
      isProjectFileStoragePathForProject({
        storagePath: data.path,
        organizationId: ctx.organizationId,
        projectId: data.projectId,
      });

    if (!ownsPath) {
      logger.warn('Rejected project file upload rollback for unowned storage path', {
        projectId: data.projectId,
        bucket: data.bucket,
      });
      return { success: false };
    }

    await deleteFile({
      path: data.path,
      bucket: PROJECT_FILE_STORAGE_BUCKET,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to discard uploaded project file', error, {
      projectId: data.projectId,
    });
    return { success: false };
  }
});
