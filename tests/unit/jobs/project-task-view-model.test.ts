import { describe, expect, it } from 'vitest';

import {
  areAllProjectTasksComplete,
  buildProjectTaskViewModels,
  filterProjectTasks,
  getProjectTaskCounts,
  groupProjectTasksByWorkstream,
  hasProjectTaskActiveFilters,
  sortProjectTasks,
} from '@/components/domain/jobs/projects/project-task-view-model';

import type {
  ProjectTaskResponse,
  TaskFilters,
  TaskWithWorkstream,
} from '@/lib/schemas/jobs';

const orgId = '00000000-0000-4000-8000-000000000001';
const projectId = '00000000-0000-4000-8000-000000000002';
const jobId = '00000000-0000-4000-8000-000000000003';
const workstreamId = '00000000-0000-4000-8000-000000000004';
const otherWorkstreamId = '00000000-0000-4000-8000-000000000005';
const userId = '00000000-0000-4000-8000-000000000006';
const siteVisitId = '00000000-0000-4000-8000-000000000007';

const noFilters: TaskFilters = {
  status: [],
  priority: [],
  assignee: 'all',
};

function makeTask(overrides: Partial<ProjectTaskResponse> = {}): ProjectTaskResponse {
  return {
    id: '00000000-0000-4000-8000-000000000010',
    organizationId: orgId,
    jobId,
    title: 'Install inverter',
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
    ...overrides,
  };
}

function makeTaskView(overrides: Partial<TaskWithWorkstream> = {}): TaskWithWorkstream {
  return {
    ...makeTask(overrides),
    workstreamName: overrides.workstreamName,
    assigneeName: overrides.assigneeName,
    siteVisitNumber: overrides.siteVisitNumber,
  };
}

describe('project task view model', () => {
  it('enriches raw task rows with workstream, assignee, and site visit labels', () => {
    const result = buildProjectTaskViewModels({
      tasks: [
        makeTask({
          workstreamId,
          assigneeId: userId,
          siteVisitId,
        }),
      ],
      workstreams: [{ id: workstreamId, name: 'Commissioning' }],
      siteVisits: [{ id: siteVisitId, visitNumber: 'V-1001' }],
      getUser: () => ({ name: 'Ava Chen' }),
    });

    expect(result[0]).toMatchObject({
      workstreamName: 'Commissioning',
      assigneeName: 'Ava Chen',
      siteVisitNumber: 'V-1001',
    });
  });

  it('counts tasks by status and normalized priority', () => {
    const counts = getProjectTaskCounts([
      makeTaskView({ id: 'task-1', status: 'pending', priority: 'urgent' }),
      makeTaskView({ id: 'task-2', status: 'pending', priority: 'high' }),
      makeTaskView({ id: 'task-3', status: 'completed', priority: 'low' }),
    ]);

    expect(counts.byStatus).toEqual({
      pending: 2,
      in_progress: 0,
      completed: 1,
      blocked: 0,
    });
    expect(counts.byPriority).toEqual({
      urgent: 1,
      high: 1,
      normal: 0,
      low: 1,
    });
  });

  it('filters by pending deletion, status, priority, and assignee mode', () => {
    const tasks = [
      makeTaskView({ id: 'task-1', status: 'pending', priority: 'urgent', assigneeId: userId }),
      makeTaskView({ id: 'task-2', status: 'completed', priority: 'low', assigneeId: null }),
      makeTaskView({ id: 'task-3', status: 'pending', priority: 'normal', assigneeId: null }),
    ];

    expect(hasProjectTaskActiveFilters(noFilters)).toBe(false);
    expect(
      hasProjectTaskActiveFilters({
        ...noFilters,
        priority: ['urgent'],
      })
    ).toBe(true);

    expect(
      filterProjectTasks({
        tasks,
        filters: {
          status: ['pending'],
          priority: ['urgent'],
          assignee: 'me',
        },
        currentUserId: userId,
        pendingDeletions: new Set(['task-3']),
      }).map(task => task.id)
    ).toEqual(['task-1']);

    expect(
      filterProjectTasks({
        tasks,
        filters: {
          ...noFilters,
          assignee: 'unassigned',
        },
        currentUserId: userId,
        pendingDeletions: new Set(),
      }).map(task => task.id)
    ).toEqual(['task-2', 'task-3']);
  });

  it('sorts tasks without mutating the source list', () => {
    const tasks = [
      makeTaskView({
        id: 'task-low',
        title: 'Z task',
        priority: 'low',
        dueDate: '2026-02-02',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      makeTaskView({
        id: 'task-urgent',
        title: 'A task',
        priority: 'urgent',
        dueDate: '2026-02-01',
        createdAt: '2026-01-03T00:00:00.000Z',
      }),
    ];

    expect(sortProjectTasks(tasks, 'priority').map(task => task.id)).toEqual([
      'task-urgent',
      'task-low',
    ]);
    expect(sortProjectTasks(tasks, 'created').map(task => task.id)).toEqual([
      'task-urgent',
      'task-low',
    ]);
    expect(sortProjectTasks(tasks, 'title').map(task => task.id)).toEqual([
      'task-urgent',
      'task-low',
    ]);
    expect(sortProjectTasks(tasks, 'dueDate').map(task => task.id)).toEqual([
      'task-urgent',
      'task-low',
    ]);
    expect(tasks.map(task => task.id)).toEqual(['task-low', 'task-urgent']);
  });

  it('groups tasks by known workstreams and keeps unassigned last', () => {
    const groups = groupProjectTasksByWorkstream({
      tasks: [
        makeTaskView({
          id: 'task-unassigned',
          workstreamName: undefined,
        }),
        makeTaskView({
          id: 'task-commissioning',
          workstreamName: 'Commissioning',
        }),
      ],
      workstreams: [
        { id: otherWorkstreamId, name: 'Assessment' },
        { id: workstreamId, name: 'Commissioning' },
      ],
    });

    expect(groups.map(([name]) => name)).toEqual(['Commissioning', 'Unassigned']);
    expect(groups[0][1].map(task => task.id)).toEqual(['task-commissioning']);
    expect(groups[1][1].map(task => task.id)).toEqual(['task-unassigned']);
  });

  it('requires at least one task and all tasks completed before the completion CTA is available', () => {
    expect(areAllProjectTasksComplete([])).toBe(false);
    expect(areAllProjectTasksComplete([makeTaskView({ status: 'completed' })])).toBe(true);
    expect(
      areAllProjectTasksComplete([
        makeTaskView({ id: 'done', status: 'completed' }),
        makeTaskView({ id: 'todo', status: 'pending' }),
      ])
    ).toBe(false);
  });
});
