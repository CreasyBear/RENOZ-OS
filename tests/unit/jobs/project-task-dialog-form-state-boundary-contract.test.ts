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
    const formState = read('src/components/domain/jobs/projects/project-task-dialog-form-state.ts');

    expect(dialogs).toContain("from './project-task-dialog-form-state'");
    expect(dialogs).toContain('buildProjectTaskTemplateOptions(templatesData?.templates ?? [])');
    expect(dialogs).toContain('getProjectTaskCreateDialogDefaultValues()');
    expect(dialogs).toContain('getProjectTaskCreateMoreResetValues(values)');
    expect(dialogs).toContain('getProjectTaskEditDialogDefaultValues()');
    expect(dialogs).toContain('getProjectTaskEditDialogResetValues(task)');
    expect(dialogs).not.toContain("z.enum(['pending'");
    expect(dialogs).not.toContain("z.enum(['urgent'");
    expect(dialogs).not.toContain('const dueDateStr =');

    expect(formState).toContain('jobTaskStatusSchema');
    expect(formState).toContain('jobTaskPrioritySchema');
    expect(formState).toContain('jobTaskStatusValues');
    expect(formState).toContain('jobTaskPriorityValues');
    expect(formState).toContain('projectTaskCreateDialogFormSchema');
    expect(formState).toContain('projectTaskEditDialogFormSchema');
  });
});
