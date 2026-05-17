import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task create dialog boundary contract', () => {
  it('keeps create dialog shell in a focused module while preserving task-dialogs exports', () => {
    const dialogs = read('src/components/domain/jobs/projects/task-dialogs.tsx');
    const createDialog = read('src/components/domain/jobs/projects/task-create-dialog.tsx');

    expect(dialogs).toContain(
      "export { TaskCreateDialog, type TaskCreateDialogProps } from './task-create-dialog';"
    );
    expect(dialogs).toContain(
      "export { TaskEditDialog, type TaskEditDialogProps } from './task-edit-dialog';"
    );
    expect(dialogs).not.toContain('export function TaskCreateDialog');
    expect(dialogs).not.toContain('useCreateTask');
    expect(dialogs).not.toContain('SiteVisitCreateDialog');
    expect(dialogs).not.toContain('WorkstreamCreateDialog');

    expect(createDialog).toContain('export function TaskCreateDialog');
    expect(createDialog).toContain('useCreateTask()');
    expect(createDialog).toContain('useSiteVisitsByProject(projectId)');
    expect(createDialog).toContain('useWorkstreams(projectId)');
    expect(createDialog).toContain("from './project-task-create-scope-fields'");
    expect(createDialog).toContain('ProjectTaskCreateScopeFields');
    expect(createDialog).toContain("from './project-task-create-template-field'");
    expect(createDialog).toContain('ProjectTaskCreateTemplateField');
    expect(createDialog).toContain("formatProjectTaskMutationError(error, 'create')");
    expect(createDialog).toContain('SiteVisitCreateDialog');
    expect(createDialog).toContain('WorkstreamCreateDialog');
  });
});
