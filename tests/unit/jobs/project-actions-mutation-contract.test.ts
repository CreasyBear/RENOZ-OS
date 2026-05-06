import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProjectMutationError } from '@/hooks/jobs/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('project actions mutation contract', () => {
  it('formats project action failures without leaking unsafe internals', () => {
    expect(
      formatProjectMutationError(
        new Error('duplicate key violates projects_project_number_idx postgres stack'),
        'complete'
      )
    ).toBe('Project completion is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProjectMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'generateWorkOrder'
      )
    ).toBe('You do not have permission to manage projects.');

    expect(
      formatProjectMutationError(
        {
          statusCode: 400,
          errors: {
            projectId: ['Project ID is required'],
          },
        },
        'generateCompletionCertificate'
      )
    ).toBe('Project ID is required');
  });

  it('keeps project-level actions operator-safe in active project surfaces', () => {
    const detailContainer = read(
      'src/components/domain/jobs/projects/containers/project-detail-container.tsx'
    );
    const completionDialog = read(
      'src/components/domain/jobs/projects/project-completion-dialog.tsx'
    );
    const listContainer = read('src/components/domain/jobs/projects/projects-list-container.tsx');
    const jobsIndex = read('src/hooks/jobs/index.ts');
    const server = read('src/server/functions/projects.ts');
    const compactServer = compact(server);

    expect(completionDialog).toContain("formatProjectMutationError(error, 'complete')");
    expect(completionDialog).toContain('submitError={submitError}');
    expect(completionDialog).not.toContain('Failed to complete project');
    expect(completionDialog).not.toContain('completeProject.error?.message');
    expect(detailContainer).toContain("formatProjectMutationError(error, 'delete')");
    expect(detailContainer).toContain(
      "formatProjectMutationError(error, 'generateWorkOrder')"
    );
    expect(detailContainer).toContain(
      "formatProjectMutationError(error, 'generateCompletionCertificate')"
    );
    expect(listContainer).toContain('formatProjectMutationError(error, "delete")');
    expect(listContainer).toContain('formatProjectMutationError(error, "bulkDelete")');
    expect(jobsIndex).toContain('formatProjectMutationError');
    expect(jobsIndex).toContain('ProjectMutationAction');

    expect(detailContainer).not.toContain("toast.error('Failed to delete project')");
    expect(detailContainer).not.toContain("toast.error('Failed to generate work order')");
    expect(detailContainer).not.toContain(
      "toast.error('Failed to generate completion certificate')"
    );
    expect(listContainer).not.toContain('toastError("Failed to delete project")');
    expect(listContainer).not.toContain('toastError("Failed to delete some projects")');
    expect(server).toContain('throw new NotFoundError("Project not found", "project")');
    expect(compactServer).toContain(
      'const[updatedProject]=awaitdb.update(projects).set(updateData).where(and(eq(projects.id,data.projectId),eq(projects.organizationId,ctx.organizationId))).returning();if(!updatedProject){thrownewNotFoundError("Projectnotfound","project");}'
    );
  });
});
