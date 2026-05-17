import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task create dialog form boundary contract', () => {
  it('keeps create mutation orchestration in a focused dialog form hook', () => {
    const createDialog = read('src/components/domain/jobs/projects/task-create-dialog.tsx');
    const createForm = read('src/components/domain/jobs/projects/project-task-create-dialog-form.ts');

    expect(createDialog).toContain("from './project-task-create-dialog-form'");
    expect(createDialog).toContain('useProjectTaskCreateDialogForm({');
    expect(createDialog).not.toContain('useCreateTask()');
    expect(createDialog).not.toContain('useTanStackForm({');
    expect(createDialog).not.toContain("formatProjectTaskMutationError(error, 'create')");
    expect(createDialog).not.toContain("toast.success('Task created successfully'");
    expect(createDialog).not.toContain("navigate({ to: '/projects/$projectId'");

    expect(createForm).toContain('export function useProjectTaskCreateDialogForm');
    expect(createForm).toContain('useCreateTask()');
    expect(createForm).toContain('useTanStackForm({');
    expect(createForm).toContain("formatProjectTaskMutationError(error, 'create')");
    expect(createForm).toContain("toast.success('Task created successfully'");
    expect(createForm).toContain("navigate({ to: '/projects/$projectId'");
    expect(createForm).toContain('getProjectTaskCreateDialogDefaultValues()');
    expect(createForm).toContain('getProjectTaskCreateMoreResetValues(values)');
    expect(createForm).toContain("form.setFieldValue('title', option.title)");
    expect(createForm).toContain("form.setFieldValue('workstreamId', workstreamId)");
  });
});
