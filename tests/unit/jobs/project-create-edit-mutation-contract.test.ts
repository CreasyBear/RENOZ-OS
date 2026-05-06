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

describe('project create/edit mutation contract', () => {
  it('formats project create and update failures without leaking unsafe internals', () => {
    expect(
      formatProjectMutationError(
        new Error('duplicate key violates projects_project_number_idx postgres stack'),
        'create'
      )
    ).toBe('Project creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProjectMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'update'
      )
    ).toBe('You do not have permission to manage projects.');

    expect(
      formatProjectMutationError(
        {
          statusCode: 400,
          errors: {
            title: ['Project title is required'],
          },
        },
        'update'
      )
    ).toBe('Project title is required');
  });

  it('keeps project create/edit feedback and update writes operator-safe and tenant-scoped', () => {
    const createDialog = read('src/components/domain/jobs/projects/project-create-dialog.tsx');
    const editDialog = read('src/components/domain/jobs/projects/project-edit-dialog.tsx');
    const server = read('src/server/functions/projects.ts');
    const jobsIndex = read('src/hooks/jobs/index.ts');
    const compactServer = compact(server);

    expect(createDialog).toContain("formatProjectMutationError(err, 'create')");
    expect(editDialog).toContain("formatProjectMutationError(err, 'update')");
    expect(jobsIndex).toContain('formatProjectMutationError');

    expect(createDialog).not.toContain("err instanceof Error ? err.message : 'Failed to create project'");
    expect(editDialog).not.toContain("err instanceof Error ? err.message : 'Failed to update project'");
    expect(compactServer).toContain(
      'const[updatedProject]=awaitdb.update(projects).set({...updates,estimatedTotalValue:updates.estimatedTotalValue?.toString(),updatedBy:ctx.user.id,updatedAt:newDate(),version:sql`${projects.version}+1`,}).where(and(eq(projects.id,projectId),eq(projects.organizationId,ctx.organizationId),isNull(projects.deletedAt))).returning();if(!updatedProject){thrownewNotFoundError("Projectnotfound","project");}'
    );
  });
});
