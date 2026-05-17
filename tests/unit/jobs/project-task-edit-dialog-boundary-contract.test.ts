import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task edit dialog boundary contract', () => {
  it('keeps edit dialog shell in a focused module while preserving task-dialogs exports', () => {
    const dialogs = read('src/components/domain/jobs/projects/task-dialogs.tsx');
    const editDialog = read('src/components/domain/jobs/projects/task-edit-dialog.tsx');

    expect(dialogs).toContain(
      "export { TaskEditDialog, type TaskEditDialogProps } from './task-edit-dialog';"
    );
    expect(dialogs).not.toContain('export function TaskEditDialog');
    expect(dialogs).not.toContain('useUpdateTask');
    expect(dialogs).not.toContain('Edit3');
    expect(dialogs).not.toContain('getProjectTaskEditDialogResetValues(task)');

    expect(editDialog).toContain('export function TaskEditDialog');
    expect(editDialog).toContain("from './project-task-edit-dialog-form'");
    expect(editDialog).toContain('useProjectTaskEditDialogForm');
    expect(editDialog).toContain('ProjectTaskStatusField');
    expect(editDialog).not.toContain('useUpdateTask()');
    expect(editDialog).not.toContain('getProjectTaskEditDialogResetValues(task)');
    expect(editDialog).not.toContain("formatProjectTaskMutationError(error, 'update')");
  });
});
