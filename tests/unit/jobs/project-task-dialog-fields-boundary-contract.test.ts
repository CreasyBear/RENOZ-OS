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
    const fields = read('src/components/domain/jobs/projects/project-task-dialog-fields.tsx');

    expect(dialogs).toContain("from './project-task-dialog-fields'");
    expect(dialogs).toContain('ProjectTaskPriorityField');
    expect(dialogs).toContain('ProjectTaskStatusField');
    expect(dialogs).toContain('ProjectTaskAssigneeField');
    expect(dialogs).toContain('ProjectTaskDueDateField');
    expect(dialogs).toContain('ProjectTaskEstimatedHoursField');
    expect(dialogs).not.toContain('CalendarIcon');
    expect(dialogs).not.toContain('PopoverTrigger');
    expect(dialogs).not.toContain('NumberField');
    expect(dialogs).not.toContain("value=\"__invite_user__\"");

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
