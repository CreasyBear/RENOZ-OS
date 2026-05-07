import { extractStoragePathFromPublicUrl } from '@/lib/storage/storage-url-utils';

export const JOB_DOCUMENT_STORAGE_BUCKET = 'attachments';

export function sanitizeJobDocumentFilename(filename: string): string {
  const sanitized = filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return sanitized || 'document';
}

export function buildJobDocumentStoragePath(params: {
  organizationId: string;
  jobAssignmentId: string;
  objectId: string;
  filename: string;
}): string {
  return [
    'organizations',
    params.organizationId,
    'jobs',
    params.jobAssignmentId,
    'documents',
    `${params.objectId}-${sanitizeJobDocumentFilename(params.filename)}`,
  ].join('/');
}

export function buildJobDocumentPhotoUrl(params: {
  storagePath: string;
  publicUrl?: string;
}): string {
  if (params.publicUrl && params.publicUrl.trim().length > 0) {
    return params.publicUrl;
  }

  return `storage://${JOB_DOCUMENT_STORAGE_BUCKET}/${params.storagePath}`;
}

export function extractJobDocumentStoragePath(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null;

  const storageScheme = 'storage://';
  if (photoUrl.startsWith(storageScheme)) {
    const rawPath = photoUrl.slice(storageScheme.length);
    const bucketPrefix = `${JOB_DOCUMENT_STORAGE_BUCKET}/`;
    return rawPath.startsWith(bucketPrefix) ? rawPath.slice(bucketPrefix.length) : rawPath;
  }

  return extractStoragePathFromPublicUrl(photoUrl, JOB_DOCUMENT_STORAGE_BUCKET);
}
