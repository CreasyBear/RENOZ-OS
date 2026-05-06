import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProjectNoteMutationError } from '@/hooks/jobs/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('project notes mutation contract', () => {
  it('formats project note mutation failures without leaking unsafe internals', () => {
    expect(
      formatProjectNoteMutationError(
        new Error('duplicate key violates project_notes_project_id_idx postgres stack'),
        'create'
      )
    ).toBe('Project note creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatProjectNoteMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'delete'
      )
    ).toBe('You do not have permission to manage project notes.');

    expect(
      formatProjectNoteMutationError(
        {
          statusCode: 400,
          errors: {
            title: ['Note title is required'],
          },
        },
        'update'
      )
    ).toBe('Note title is required');
  });

  it('keeps project note mutations project-scoped, cache-safe, and operator-safe', () => {
    const tab = read('src/components/domain/jobs/projects/project-notes-tab.tsx');
    const dialogs = read('src/components/domain/jobs/projects/note-dialogs.tsx');
    const hooks = read('src/hooks/jobs/use-notes.ts');
    const jobsIndex = read('src/hooks/jobs/index.ts');
    const server = read('src/server/functions/notes.ts');
    const schema = read('src/lib/schemas/jobs/workstreams-notes.ts');
    const compactHooks = compact(hooks);
    const compactServer = compact(server);

    expect(tab).toContain("toast.error(formatProjectNoteMutationError(error, 'delete'))");
    expect(tab).not.toContain("toast.error('Failed to delete note')");
    expect(tab).not.toContain('catch {');

    expect(dialogs).toContain("formatProjectNoteMutationError(error, 'create')");
    expect(dialogs).toContain("formatProjectNoteMutationError(error, 'update')");
    expect(dialogs).not.toContain("err instanceof Error ? err.message : 'Failed to create note'");
    expect(dialogs).not.toContain("err instanceof Error ? err.message : 'Failed to update note'");

    expect(jobsIndex).toContain('formatProjectNoteMutationError');
    expect(schema).toContain('projectScopedNoteIdSchema');
    expect(schema).toContain('projectId: z.string().uuid()');

    expect(compactHooks).toContain('updateNote({data:{...data,projectId}})');
    expect(compactHooks).toContain('deleteNote({data:{id,projectId}})');
    expect(hooks).toContain('queryKeys.projectNotes.byProject(projectId)');
    expect(hooks).toContain('queryKeys.projectNotes.stats(projectId)');
    expect(hooks).toContain('queryKeys.projectNotes.detail(result.data.id)');

    expect(server).toContain('projectScopedNoteIdSchema');
    expect(server).toContain("throw new NotFoundError('Project note not found', 'projectNote')");
    expect(compactServer).toContain(
      'where(and(eq(projectNotes.id,id),eq(projectNotes.projectId,projectId),eq(projectNotes.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).toContain(
      'where(and(eq(projectNotes.id,data.id),eq(projectNotes.projectId,data.projectId),eq(projectNotes.organizationId,ctx.organizationId)))'
    );
    expect(compactServer).not.toContain('.where(and(eq(projectNotes.id,data.id),eq(projectNotes.organizationId,ctx.organizationId))).returning({id:projectNotes.id})');
  });
});
