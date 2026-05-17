import { describe, expect, it } from 'vitest';

import {
  getProjectTaskCreateDialogKey,
  getProjectTaskEditDialogOpen,
  shouldClearProjectTaskEditingTask,
} from '@/components/domain/jobs/projects/project-task-dialog-state';

describe('project task dialog state helpers', () => {
  it('derives stable create dialog remount keys from open state', () => {
    expect(getProjectTaskCreateDialogKey(true)).toBe('open');
    expect(getProjectTaskCreateDialogKey(false)).toBe('closed');
  });

  it('treats a selected editing task as an open edit dialog', () => {
    expect(getProjectTaskEditDialogOpen(null)).toBe(false);
    expect(getProjectTaskEditDialogOpen({ id: 'task-1' } as never)).toBe(true);
  });

  it('clears the selected editing task only when the edit dialog closes', () => {
    expect(shouldClearProjectTaskEditingTask(false)).toBe(true);
    expect(shouldClearProjectTaskEditingTask(true)).toBe(false);
  });
});
