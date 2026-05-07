import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildJobDocumentPhotoUrl,
  buildJobDocumentStoragePath,
  extractJobDocumentStoragePath,
  JOB_DOCUMENT_STORAGE_BUCKET,
  sanitizeJobDocumentFilename,
} from '@/lib/jobs/job-document-storage';

const root = process.cwd();
const previousSupabaseUrl = process.env.SUPABASE_URL;

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

afterEach(() => {
  if (previousSupabaseUrl === undefined) {
    delete process.env.SUPABASE_URL;
  } else {
    process.env.SUPABASE_URL = previousSupabaseUrl;
  }
});

describe('job documents storage contract', () => {
  it('builds tenant and job scoped storage paths with sanitized filenames', () => {
    expect(sanitizeJobDocumentFilename('  Site Visit Invoice #42.PDF  ')).toBe(
      'site-visit-invoice-42.pdf'
    );

    expect(
      buildJobDocumentStoragePath({
        organizationId: 'org-1',
        jobAssignmentId: 'job-1',
        objectId: 'file-1',
        filename: 'Site Visit Invoice #42.PDF',
      })
    ).toBe('organizations/org-1/jobs/job-1/documents/file-1-site-visit-invoice-42.pdf');
  });

  it('keeps fallback storage urls reversible for delete cleanup', () => {
    const path = 'organizations/org-1/jobs/job-1/documents/file-1-photo.jpg';

    expect(
      buildJobDocumentPhotoUrl({
        storagePath: path,
      })
    ).toBe(`storage://${JOB_DOCUMENT_STORAGE_BUCKET}/${path}`);

    expect(extractJobDocumentStoragePath(`storage://${JOB_DOCUMENT_STORAGE_BUCKET}/${path}`)).toBe(
      path
    );
    expect(extractJobDocumentStoragePath(`storage://${path}`)).toBe(path);
  });

  it('extracts paths from owned public Supabase storage urls', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    const path = 'organizations/org-1/jobs/job-1/documents/file-1-photo.jpg';
    const publicUrl = `https://example.supabase.co/storage/v1/object/public/${JOB_DOCUMENT_STORAGE_BUCKET}/${path}`;

    expect(extractJobDocumentStoragePath(publicUrl)).toBe(path);
  });

  it('wires job document upload and delete to real storage lifecycle', () => {
    const server = read('src/server/functions/jobs/job-documents.ts');

    expect(server).toContain('withAuth({ permission: PERMISSIONS.job.create })');
    expect(server).toContain('withAuth({ permission: PERMISSIONS.job.read })');
    expect(server).toContain('withAuth({ permission: PERMISSIONS.job.delete })');
    expect(server).toContain('buildJobDocumentStoragePath({');
    expect(server).toContain('uploadFile({');
    expect(server).toContain('uploadedStoragePath = uploadResult.path;');
    expect(server).toContain("operation: 'uploadRollback'");
    expect(server).toContain('extractJobDocumentStoragePath(deletedPhoto.photoUrl)');
    expect(server).toContain('deleteFile({');
    expect(server).toContain(
      'Job document upload is temporarily unavailable. Please refresh and try again.'
    );
    expect(server).toContain(
      'Job document deletion is temporarily unavailable. Please refresh and try again.'
    );

    expect(server).not.toContain('simulate the upload');
    expect(server).not.toContain('/api/files/job-documents');
    expect(server).not.toContain('Placeholder URL');
    expect(server).not.toContain('deleteFileFromStorage');
    expect(server).not.toContain('Sample extracted text');
    expect(server).not.toContain(
      "error instanceof Error ? error.message : 'Failed to upload document'"
    );
    expect(server).not.toContain(
      "error instanceof Error ? error.message : 'Failed to delete document'"
    );
  });
});
