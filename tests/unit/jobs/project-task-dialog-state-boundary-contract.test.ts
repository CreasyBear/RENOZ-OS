import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task dialog state boundary contract', () => {
  it('keeps create/edit dialog state ownership behind a focused hook', () => {
    const tab = read('src/components/domain/jobs/projects/project-tasks-tab.tsx');
    const dialogState = read('src/components/domain/jobs/projects/project-task-dialog-state.ts');

    expect(tab).toContain("import { useProjectTaskDialogState } from './project-task-dialog-state';");
    expect(tab).toContain('const taskDialogs = useProjectTaskDialogState()');
    expect(tab).toContain('taskDialogs.openCreateDialog');
    expect(tab).toContain('taskDialogs.openEditTask');
    expect(tab).toContain('taskDialogs.handleEditDialogOpenChange');
    expect(tab).toContain('key={taskDialogs.createDialogKey}');
    expect(tab).toContain('open={taskDialogs.isEditDialogOpen}');
    expect(tab).not.toContain('useState');
    expect(tab).not.toContain('setEditingTask');
    expect(tab).not.toContain('setCreateDialogOpen(true)');
    expect(tab).not.toContain('!!editingTask');

    expect(dialogState).toContain('useState<TaskWithWorkstream | null>(null)');
    expect(dialogState).toContain('useState(false)');
    expect(dialogState).toContain('getProjectTaskCreateDialogKey(isCreateDialogOpen)');
    expect(dialogState).toContain('getProjectTaskEditDialogOpen(editingTask)');
    expect(dialogState).toContain('shouldClearProjectTaskEditingTask(open)');
    expect(dialogState).toContain('setEditingTask(null)');
  });
});
