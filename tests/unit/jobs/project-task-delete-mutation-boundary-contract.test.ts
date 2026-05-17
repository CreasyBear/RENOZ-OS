import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task delete mutation boundary contract', () => {
  it('keeps undoable delete timing, restore, and operator-safe failure behind a focused hook', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const controller = read('src/components/domain/jobs/projects/project-tasks-tab-controller.ts');
    const deleteMutation = read('src/components/domain/jobs/projects/project-task-delete-mutation.ts');
    const deleteState = read('src/components/domain/jobs/projects/project-task-delete-state.ts');

    expect(tab).toContain("from './project-tasks-tab-controller';");
    expect(tab).not.toContain("import { useProjectTaskDeleteMutation } from './project-task-delete-mutation';");
    expect(tab).not.toContain('useProjectTaskDeleteMutation({');
    expect(tab).not.toContain('pendingDeletions');
    expect(controller).toContain("import { useProjectTaskDeleteMutation } from './project-task-delete-mutation';");
    expect(controller).toContain('useProjectTaskDeleteMutation({');
    expect(controller).toContain('onDeleted: refetch');
    expect(controller).toContain('pendingDeletions');
    expect(tab).not.toContain('useDeleteProjectTask');
    expect(tab).not.toContain('deleteTimeouts');
    expect(tab).not.toContain('setTimeout(async');
    expect(tab).not.toContain("formatProjectTaskMutationError(error, 'delete')");

    expect(deleteMutation).toContain('useDeleteProjectTask(projectId)');
    expect(deleteMutation).toContain('const PROJECT_TASK_DELETE_UNDO_MS = 5000');
    expect(deleteMutation).toContain('setTimeout(async () =>');
    expect(deleteMutation).toContain('await deleteTask.mutateAsync({ taskId, jobId })');
    expect(deleteMutation).toContain('onDeleted?.()');
    expect(deleteMutation).toContain("formatProjectTaskMutationError(error, 'delete')");
    expect(deleteMutation).toContain('clearDeleteTimeout(taskId)');
    expect(deleteMutation).toContain("toast.info('Task restored')");
    expect(deleteState).toContain('addProjectTaskPendingDeletion');
    expect(deleteState).toContain('removeProjectTaskPendingDeletion');
  });
});
