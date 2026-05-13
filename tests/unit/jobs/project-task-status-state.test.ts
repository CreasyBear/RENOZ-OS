import { describe, expect, it } from 'vitest';

import {
  getNextProjectTaskStatus,
  willCompleteAllVisibleProjectTasks,
} from '@/components/domain/jobs/projects/project-task-status-state';

import type { JobTaskStatus, TaskWithWorkstream } from '@/lib/schemas/jobs';

const orgId = '00000000-0000-4000-8000-000000000001';
const projectId = '00000000-0000-4000-8000-000000000002';
const jobId = '00000000-0000-4000-8000-000000000003';

function makeTask(id: string, status: JobTaskStatus): TaskWithWorkstream {
  return {
    id,
    organizationId: orgId,
    jobId,
    title: id,
    description: null,
    status,
    priority: 'normal',
    assigneeId: null,
    dueDate: null,
    position: 0,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: null,
    updatedBy: null,
    siteVisitId: null,
    projectId,
    workstreamId: null,
    estimatedHours: null,
    actualHours: null,
  };
}

describe('project task status state helpers', () => {
  it('toggles completed tasks back to pending and all other states to completed', () => {
    expect(getNextProjectTaskStatus('completed')).toBe('pending');
    expect(getNextProjectTaskStatus('pending')).toBe('completed');
    expect(getNextProjectTaskStatus('in_progress')).toBe('completed');
    expect(getNextProjectTaskStatus('blocked')).toBe('completed');
  });

  it('detects whether toggling one task completes the visible task list', () => {
    expect(
      willCompleteAllVisibleProjectTasks({
        tasks: [
          makeTask('task-1', 'pending'),
          makeTask('task-2', 'completed'),
        ],
        toggledTaskId: 'task-1',
      })
    ).toBe(true);

    expect(
      willCompleteAllVisibleProjectTasks({
        tasks: [
          makeTask('task-1', 'pending'),
          makeTask('task-2', 'pending'),
        ],
        toggledTaskId: 'task-1',
      })
    ).toBe(false);

    expect(
      willCompleteAllVisibleProjectTasks({
        tasks: [],
        toggledTaskId: 'task-1',
      })
    ).toBe(false);
  });
});
