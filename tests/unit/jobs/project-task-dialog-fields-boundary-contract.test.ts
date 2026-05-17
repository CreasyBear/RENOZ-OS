import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('project task dialog fields boundary contract', () => {
  it('keeps repeated create/edit field rendering behind focused field components', () => {
    const dialogs = read('src/components/domain/jobs/projects/task-dialogs.tsx');
    const createDialog = read('src/components/domain/jobs/projects/task-create-dialog.tsx');
    const editDialog = read('src/components/domain/jobs/projects/task-edit-dialog.tsx');
    const fields = read('src/components/domain/jobs/projects/project-task-dialog-fields.tsx');
    const dialogRenderers = `${createDialog}\n${editDialog}`;

    expect(createDialog).toContain("from './project-task-dialog-fields'");
    expect(editDialog).toContain("from './project-task-dialog-fields'");
    expect(dialogRenderers).toContain('ProjectTaskPriorityField');
    expect(dialogRenderers).toContain('ProjectTaskStatusField');
    expect(dialogRenderers).toContain('ProjectTaskAssigneeField');
    expect(dialogRenderers).toContain('ProjectTaskDueDateField');
    expect(dialogRenderers).toContain('ProjectTaskEstimatedHoursField');
    expect(dialogRenderers).not.toContain('CalendarIcon');
    expect(dialogRenderers).not.toContain('PopoverTrigger');
    expect(dialogRenderers).not.toContain('NumberField');
    expect(dialogRenderers).not.toContain("value=\"__invite_user__\"");
    expect(dialogs).not.toContain("from './project-task-dialog-fields'");

    expect(fields).toContain('PROJECT_TASK_PRIORITY_OPTIONS');
    expect(fields).toContain('PROJECT_TASK_STATUS_OPTIONS');
    expect(fields).toContain('ProjectTaskPriorityField');
    expect(fields).toContain('ProjectTaskStatusField');
    expect(fields).toContain('ProjectTaskAssigneeField');
    expect(fields).toContain('ProjectTaskDueDateField');
    expect(fields).toContain('ProjectTaskEstimatedHoursField');
    expect(fields).toContain("field.setValue(value === 'unassigned' ? emptyValue : value)");
    expect(fields).toContain("field.handleChange(date ? format(date, 'yyyy-MM-dd') : emptyValue)");
  });
});
