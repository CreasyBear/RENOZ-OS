import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task edit dialog form boundary contract', () => {
  it('keeps update mutation orchestration in a focused dialog form hook', () => {
    const editDialog = read('src/components/domain/jobs/projects/task-edit-dialog.tsx');
    const editDialogForm = read('src/components/domain/jobs/projects/project-task-edit-dialog-form.ts');

    expect(editDialog).toContain("from './project-task-edit-dialog-form'");
    expect(editDialog).toContain('useProjectTaskEditDialogForm({');
    expect(editDialog).not.toContain('useUpdateTask()');
    expect(editDialog).not.toContain('useTanStackForm({');
    expect(editDialog).not.toContain("formatProjectTaskMutationError(error, 'update')");
    expect(editDialog).not.toContain('getProjectTaskEditDialogResetValues(task)');
    expect(editDialog).not.toContain("toast.success('Task updated successfully')");

    expect(editDialogForm).toContain('export function useProjectTaskEditDialogForm');
    expect(editDialogForm).toContain('useUpdateTask()');
    expect(editDialogForm).toContain('useTanStackForm({');
    expect(editDialogForm).toContain("formatProjectTaskMutationError(error, 'update')");
    expect(editDialogForm).toContain('getProjectTaskEditDialogResetValues(task)');
    expect(editDialogForm).toContain("toast.success('Task updated successfully')");
    expect(editDialogForm).toContain('jobId: task.jobId');
    expect(editDialogForm).toContain('if (!newOpen && updateTask.isPending) return');
  });
});
