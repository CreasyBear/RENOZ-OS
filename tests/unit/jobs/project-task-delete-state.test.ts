import { describe, expect, it } from 'vitest';

import {
  addProjectTaskPendingDeletion,
  removeProjectTaskPendingDeletion,
} from '@/components/domain/jobs/projects/project-task-delete-state';

describe('project task delete pending state', () => {
  it('adds a pending deletion without mutating the existing set', () => {
    const existing = new Set(['task-1']);
    const next = addProjectTaskPendingDeletion({
      pendingDeletions: existing,
      taskId: 'task-2',
    });

    expect(next).toEqual(new Set(['task-1', 'task-2']));
    expect(existing).toEqual(new Set(['task-1']));
    expect(next).not.toBe(existing);
  });

  it('removes a pending deletion without mutating the existing set', () => {
    const existing = new Set(['task-1', 'task-2']);
    const next = removeProjectTaskPendingDeletion({
      pendingDeletions: existing,
      taskId: 'task-1',
    });

    expect(next).toEqual(new Set(['task-2']));
    expect(existing).toEqual(new Set(['task-1', 'task-2']));
    expect(next).not.toBe(existing);
  });
});
