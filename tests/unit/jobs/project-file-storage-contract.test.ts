import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildProjectFileStoragePath,
  extractProjectFileStoragePath,
  isProjectFileStoragePathForProject,
  PROJECT_FILE_STORAGE_BUCKET,
  sanitizeProjectFileName,
} from '@/lib/jobs/project-file-storage';

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

describe('project file storage contract', () => {
  it('builds tenant and project scoped storage paths with sanitized filenames', () => {
    expect(sanitizeProjectFileName('  Electrical Drawing #7.PDF  ')).toBe(
      'electrical-drawing-7.pdf'
    );

    expect(
      buildProjectFileStoragePath({
        organizationId: 'org-1',
        projectId: 'project-1',
        objectId: 'file-1',
        filename: 'Electrical Drawing #7.PDF',
      })
    ).toBe('organizations/org-1/projects/project-1/files/file-1-electrical-drawing-7.pdf');
  });

  it('extracts storage paths from fallback and owned public urls', () => {
    const path = 'organizations/org-1/projects/project-1/files/file-1-drawing.pdf';

    expect(extractProjectFileStoragePath(`storage://${PROJECT_FILE_STORAGE_BUCKET}/${path}`)).toBe(
      path
    );
    expect(extractProjectFileStoragePath(`storage://${path}`)).toBe(path);

    process.env.SUPABASE_URL = 'https://example.supabase.co';
    expect(
      extractProjectFileStoragePath(
        `https://example.supabase.co/storage/v1/object/public/${PROJECT_FILE_STORAGE_BUCKET}/${path}`
      )
    ).toBe(path);
  });

  it('recognizes only tenant/project scoped project file paths as owned', () => {
    expect(
      isProjectFileStoragePathForProject({
        storagePath: 'organizations/org-1/projects/project-1/files/file-1-drawing.pdf',
        organizationId: 'org-1',
        projectId: 'project-1',
      })
    ).toBe(true);

    expect(
      isProjectFileStoragePathForProject({
        storagePath: 'organizations/org-1/projects/project-2/files/file-1-drawing.pdf',
        organizationId: 'org-1',
        projectId: 'project-1',
      })
    ).toBe(false);
  });

  it('keeps project file uploads server-owned and project scoped', () => {
    const uploadServer = read('src/server/functions/files/upload-project-file.ts');
    const dialog = read('src/components/domain/jobs/projects/file-dialogs.tsx');

    expect(uploadServer).toContain('withAuth({ permission: PERMISSIONS.job.create })');
    expect(uploadServer).toContain('verifyProjectExists(params.projectId, ctx.organizationId)');
    expect(uploadServer).toContain('buildProjectFileStoragePath({');
    expect(uploadServer).toContain('organizationId: ctx.organizationId');
    expect(uploadServer).toContain('projectId: params.projectId');
    expect(uploadServer).toContain('uploadFile({');
    expect(uploadServer).toContain('bucket: PROJECT_FILE_STORAGE_BUCKET');
    expect(uploadServer).toContain('discardUploadedProjectFile');
    expect(uploadServer).toContain('isProjectFileStoragePathForProject({');
    expect(uploadServer).toContain("logger.warn('Rejected project file upload rollback");

    expect(uploadServer).toContain('filename: string;');
    expect(uploadServer).toContain('path: storagePath');
    expect(dialog).not.toContain('const storagePath = `projects/${projectId}/');
    expect(dialog).toContain('discardUploadedProjectFile({');
    expect(dialog).toContain('projectId,');
    expect(dialog).toContain('filename: selectedFile.name');
    expect(dialog).toContain('storage://${uploadResult.bucket}/${uploadResult.path}');
  });

  it('removes backing storage objects when project file records are deleted', () => {
    const server = read('src/server/functions/files.ts');

    expect(server).toContain('removeProjectFileStorageObject');
    expect(server).toContain('extractProjectFileStoragePath(deletedFile.fileUrl)');
    expect(server).toContain('deleteStorageFile({');
    expect(server).toContain('bucket: PROJECT_FILE_STORAGE_BUCKET');
    expect(server).toContain("logger.error('Failed to remove project file storage object'");
    expect(server).not.toContain('.where(eq(projectFiles.id, data.id))');
  });
});
