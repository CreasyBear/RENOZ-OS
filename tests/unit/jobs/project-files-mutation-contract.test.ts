import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProjectFileMutationError } from '@/hooks/jobs/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('project files mutation contract', () => {
  it('formats project file mutation failures without leaking unsafe internals', () => {
    expect(
      formatProjectFileMutationError(
        new Error('duplicate key violates project_files_position_idx postgres stack'),
        'upload'
      )
    ).toBe('Project file upload is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProjectFileMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'delete'
      )
    ).toBe('You do not have permission to manage project files.');

    expect(
      formatProjectFileMutationError(
        {
          statusCode: 400,
          errors: {
            fileName: ['File name is required'],
          },
        },
        'update'
      )
    ).toBe('File name is required');
  });

  it('keeps project file mutations project-scoped, cache-safe, and operator-safe', () => {
    const tab = read('src/components/domain/jobs/projects/project-files-tab.tsx');
    const dialog = read('src/components/domain/jobs/projects/file-dialogs.tsx');
    const hooks = read('src/hooks/jobs/use-files.ts');
    const jobsIndex = read('src/hooks/jobs/index.ts');
    const server = read('src/server/functions/files.ts');
    const uploadServer = read('src/server/functions/files/upload-project-file.ts');
    const schema = read('src/lib/schemas/jobs/workstreams-notes.ts');
    const compactHooks = compact(hooks);
    const compactServer = compact(server);

    expect(tab).toContain("toast.error(formatProjectFileMutationError(error, 'delete'))");
    expect(tab).not.toContain("toast.error('Failed to delete file')");
    expect(tab).not.toContain('catch {');

    expect(dialog).toContain("formatProjectFileMutationError(error, 'upload')");
    expect(dialog).toContain('description: data.description');
    expect(dialog).toContain('filename: selectedFile.name');
    expect(dialog).toContain('discardUploadedProjectFile({');
    expect(dialog).toContain('path: uploadResult.path');
    expect(dialog).toContain('bucket: uploadResult.bucket');
    expect(dialog).not.toContain('const storagePath = `projects/${projectId}/');
    expect(dialog).not.toContain("error instanceof Error ? error.message : 'Unknown error'");
    expect(dialog).not.toContain('toast.error(`Failed to upload file: ${message}`)');
    expect(dialog).not.toContain('position: 0,');

    expect(jobsIndex).toContain('formatProjectFileMutationError');
    expect(schema).toContain('projectScopedFileIdSchema');
    expect(schema).toContain('position: z.number().int().min(0).optional()');
    expect(schema).toContain('projectId: z.string().uuid()');

    expect(compactHooks).toContain('updateFile({data:{...data,projectId}})');
    expect(compactHooks).toContain('deleteFile({data:{id,projectId}})');
    expect(hooks).toContain('queryKeys.projectFiles.byProject(projectId)');
    expect(hooks).toContain('queryKeys.projectFiles.stats(projectId)');
    expect(hooks).toContain('queryKeys.projectFiles.detail(result.data.id)');

    expect(server).toContain('projectScopedFileIdSchema');
    expect(server).toContain('extractProjectFileStoragePath(deletedFile.fileUrl)');
    expect(server).toContain('deleteStorageFile({');
    expect(server).toContain("description: data.description ?? null");
    expect(server).toContain("throw new NotFoundError('Project file not found', 'projectFile')");
    expect(compactServer).toContain('awaitdb.transaction(async(tx)=>');
    expect(compactServer).toContain(
      'where(and(eq(projectFiles.id,id),eq(projectFiles.projectId,projectId),eq(projectFiles.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).toContain(
      'where(and(eq(projectFiles.id,data.id),eq(projectFiles.projectId,data.projectId),eq(projectFiles.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).not.toContain('.where(eq(projectFiles.id,data.id))');
    expect(compactServer).not.toContain('description:null');

    expect(uploadServer).toContain('withAuth({ permission: PERMISSIONS.job.create })');
    expect(uploadServer).toContain('verifyProjectExists(params.projectId, ctx.organizationId)');
    expect(uploadServer).toContain('buildProjectFileStoragePath({');
    expect(uploadServer).toContain('discardUploadedProjectFile');
    expect(uploadServer).toContain('isProjectFileStoragePathForProject({');
    expect(uploadServer).toContain('deleteFile({');
    expect(uploadServer).toContain('path: storagePath');
  });
});
