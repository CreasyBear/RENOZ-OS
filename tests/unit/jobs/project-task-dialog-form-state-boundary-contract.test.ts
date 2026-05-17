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
    const createDialogForm = read('src/components/domain/jobs/projects/project-task-create-dialog-form.ts');
    const editDialog = read('src/components/domain/jobs/projects/task-edit-dialog.tsx');
    const editDialogForm = read('src/components/domain/jobs/projects/project-task-edit-dialog-form.ts');
    const formState = read('src/components/domain/jobs/projects/project-task-dialog-form-state.ts');
    const dialogFormOwners = `${createDialog}\n${createDialogForm}\n${editDialog}\n${editDialogForm}`;

    expect(createDialog).toContain("from './project-task-dialog-form-state'");
    expect(createDialog).toContain('buildProjectTaskTemplateOptions(templatesData?.templates ?? [])');
    expect(createDialogForm).toContain("from './project-task-dialog-form-state'");
    expect(createDialogForm).toContain('getProjectTaskCreateDialogDefaultValues()');
    expect(createDialogForm).toContain('getProjectTaskCreateMoreResetValues(values)');
    expect(createDialogForm).toContain('projectTaskCreateDialogFormSchema');
    expect(editDialogForm).toContain("from './project-task-dialog-form-state'");
    expect(editDialogForm).toContain('getProjectTaskEditDialogDefaultValues()');
    expect(editDialogForm).toContain('getProjectTaskEditDialogResetValues(task)');
    expect(editDialogForm).toContain('projectTaskEditDialogFormSchema');
    expect(dialogs).not.toContain("from './project-task-dialog-form-state'");
    expect(dialogFormOwners).not.toContain("z.enum(['pending'");
    expect(dialogFormOwners).not.toContain("z.enum(['urgent'");
    expect(dialogFormOwners).not.toContain('const dueDateStr =');

    expect(formState).toContain('jobTaskStatusSchema');
    expect(formState).toContain('jobTaskPrioritySchema');
    expect(formState).toContain('jobTaskStatusValues');
    expect(formState).toContain('jobTaskPriorityValues');
    expect(formState).toContain('projectTaskCreateDialogFormSchema');
    expect(formState).toContain('projectTaskEditDialogFormSchema');
  });
});
