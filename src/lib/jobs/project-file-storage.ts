import { extractStoragePathFromPublicUrl } from '@/lib/storage/storage-url-utils';

export const PROJECT_FILE_STORAGE_BUCKET = 'attachments';

export function sanitizeProjectFileName(filename: string): string {
  const sanitized = filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return sanitized || 'file';
}

export function buildProjectFileStoragePath(params: {
  organizationId: string;
  projectId: string;
  objectId: string;
  filename: string;
}): string {
  return [
    'organizations',
    params.organizationId,
    'projects',
    params.projectId,
    'files',
    `${params.objectId}-${sanitizeProjectFileName(params.filename)}`,
  ].join('/');
}

export function extractProjectFileStoragePath(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;

  const storageScheme = 'storage://';
  if (fileUrl.startsWith(storageScheme)) {
    const rawPath = fileUrl.slice(storageScheme.length);
    const bucketPrefix = `${PROJECT_FILE_STORAGE_BUCKET}/`;
    return rawPath.startsWith(bucketPrefix) ? rawPath.slice(bucketPrefix.length) : rawPath;
  }

  return extractStoragePathFromPublicUrl(fileUrl, PROJECT_FILE_STORAGE_BUCKET);
}
