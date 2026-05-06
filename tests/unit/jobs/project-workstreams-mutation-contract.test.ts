import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProjectWorkstreamMutationError } from '@/hooks/jobs/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('project workstreams mutation contract', () => {
  it('formats project workstream mutation failures without leaking unsafe internals', () => {
    expect(
      formatProjectWorkstreamMutationError(
        new Error('duplicate key violates project_workstreams_position_idx postgres stack'),
        'create'
      )
    ).toBe('Project workstream creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProjectWorkstreamMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'delete'
      )
    ).toBe('You do not have permission to manage project workstreams.');

    expect(
      formatProjectWorkstreamMutationError(
        {
          statusCode: 400,
          errors: {
            name: ['Workstream name is required'],
          },
        },
        'update'
      )
    ).toBe('Workstream name is required');
  });

  it('keeps project workstream mutations project-scoped, cache-safe, and operator-safe', () => {
    const tab = read('src/components/domain/jobs/projects/project-detail-tabs.tsx');
    const dialogs = read('src/components/domain/jobs/projects/workstream-dialogs.tsx');
    const hooks = read('src/hooks/jobs/use-workstreams.ts');
    const jobsIndex = read('src/hooks/jobs/index.ts');
    const server = read('src/server/functions/workstreams.ts');
    const schema = read('src/lib/schemas/jobs/workstreams-notes.ts');
    const compactHooks = compact(hooks);
    const compactServer = compact(server);

    expect(tab).toContain("toast.error(formatProjectWorkstreamMutationError(error, 'delete'))");
    expect(tab).toContain("toast.error(formatProjectWorkstreamMutationError(error, 'reorder'))");
    expect(tab).not.toContain("toast.error('Failed to delete workstream')");
    expect(tab).not.toContain("toast.error('Failed to reorder workstreams')");

    expect(dialogs).toContain("formatProjectWorkstreamMutationError(error, 'create')");
    expect(dialogs).toContain("formatProjectWorkstreamMutationError(error, 'update')");
    expect(dialogs).not.toContain("err instanceof Error ? err.message : 'Failed to create workstream'");
    expect(dialogs).not.toContain("err instanceof Error ? err.message : 'Failed to update workstream'");
    expect(dialogs).not.toContain('position: 0,');

    expect(jobsIndex).toContain('formatProjectWorkstreamMutationError');
    expect(schema).toContain('projectScopedWorkstreamIdSchema');
    expect(schema).toContain('position: z.number().int().min(0).optional()');
    expect(schema).toContain('projectId: z.string().uuid()');

    expect(compactHooks).toContain('updateWorkstream({data:{...data,projectId}})');
    expect(compactHooks).toContain('deleteWorkstream({data:{id,projectId}})');
    expect(compactHooks).toContain('reorderWorkstreams({data:{projectId,workstreamIds}})');
    expect(hooks).toContain('queryKeys.projectWorkstreams.byProject(projectId)');
    expect(hooks).toContain('queryKeys.projectWorkstreams.detail(result.data.id)');

    expect(server).toContain('projectScopedWorkstreamIdSchema');
    expect(server).toContain(
      "throw new NotFoundError('Project workstream not found', 'projectWorkstream')"
    );
    expect(compactServer).toContain(
      'where(and(eq(projectWorkstreams.id,id),eq(projectWorkstreams.projectId,projectId),eq(projectWorkstreams.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).toContain(
      'where(and(eq(projectWorkstreams.id,data.id),eq(projectWorkstreams.projectId,data.projectId),eq(projectWorkstreams.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).toContain(
      'for(const[index,id]ofdata.workstreamIds.entries()){const[updated]=awaittx.update(projectWorkstreams)'
    );
    expect(compactServer).toContain('.returning({id:projectWorkstreams.id})');
    expect(compactServer).not.toContain('.where(eq(projectWorkstreams.id,data.id))');
  });
});
