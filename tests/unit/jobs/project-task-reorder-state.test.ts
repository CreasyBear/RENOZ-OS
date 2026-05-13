import { describe, expect, it } from 'vitest';

import { getProjectTaskReorderJobId } from '@/components/domain/jobs/projects/project-task-reorder-state';

import type { TaskWithWorkstream } from '@/lib/schemas/jobs';

const orgId = '00000000-0000-4000-8000-000000000001';
const projectId = '00000000-0000-4000-8000-000000000002';

function makeTask(id: string, jobId: string): TaskWithWorkstream {
  return {
    id,
    organizationId: orgId,
    jobId,
    title: id,
    description: null,
    status: 'pending',
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

describe('project task reorder state helpers', () => {
  it('uses the first reordered task to resolve the job-scoped reorder id', () => {
    expect(
      getProjectTaskReorderJobId({
        tasks: [
          makeTask('task-1', 'job-1'),
          makeTask('task-2', 'job-2'),
        ],
        taskIds: ['task-2', 'task-1'],
      })
    ).toBe('job-2');
  });

  it('returns null when no task id can be resolved', () => {
    expect(
      getProjectTaskReorderJobId({
        tasks: [makeTask('task-1', 'job-1')],
        taskIds: [],
      })
    ).toBeNull();

    expect(
      getProjectTaskReorderJobId({
        tasks: [makeTask('task-1', 'job-1')],
        taskIds: ['missing-task'],
      })
    ).toBeNull();
  });
});
