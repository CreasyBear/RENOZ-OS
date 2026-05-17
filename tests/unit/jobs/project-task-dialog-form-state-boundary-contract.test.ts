import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task dialog form state boundary contract', () => {
  it('keeps task dialog form schemas and pure reset helpers out of the dialog renderer', () => {
    const dialogs = read('src/components/domain/jobs/projects/task-dialogs.tsx');
    const createDialog = read('src/components/domain/jobs/projects/task-create-dialog.tsx');
    const editDialog = read('src/components/domain/jobs/projects/task-edit-dialog.tsx');
    const formState = read('src/components/domain/jobs/projects/project-task-dialog-form-state.ts');
    const dialogRenderers = `${createDialog}\n${editDialog}`;

    expect(createDialog).toContain("from './project-task-dialog-form-state'");
    expect(editDialog).toContain("from './project-task-dialog-form-state'");
    expect(createDialog).toContain('buildProjectTaskTemplateOptions(templatesData?.templates ?? [])');
    expect(createDialog).toContain('getProjectTaskCreateDialogDefaultValues()');
    expect(createDialog).toContain('getProjectTaskCreateMoreResetValues(values)');
    expect(editDialog).toContain('getProjectTaskEditDialogDefaultValues()');
    expect(editDialog).toContain('getProjectTaskEditDialogResetValues(task)');
    expect(dialogs).not.toContain("from './project-task-dialog-form-state'");
    expect(dialogRenderers).not.toContain("z.enum(['pending'");
    expect(dialogRenderers).not.toContain("z.enum(['urgent'");
    expect(dialogRenderers).not.toContain('const dueDateStr =');

    expect(formState).toContain('jobTaskStatusSchema');
    expect(formState).toContain('jobTaskPrioritySchema');
    expect(formState).toContain('jobTaskStatusValues');
    expect(formState).toContain('jobTaskPriorityValues');
    expect(formState).toContain('projectTaskCreateDialogFormSchema');
    expect(formState).toContain('projectTaskEditDialogFormSchema');
  });
});
