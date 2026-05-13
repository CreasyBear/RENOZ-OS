import { describe, expect, it } from 'vitest';

import {
  buildProjectTaskFilterSearch,
  buildProjectTaskSortSearch,
  parseProjectTaskFilters,
  parseProjectTaskSort,
} from '@/components/domain/jobs/projects/project-task-route-state';

describe('project task route state helpers', () => {
  it('parses valid task filter params and drops invalid status or priority values', () => {
    expect(
      parseProjectTaskFilters({
        taskStatus: 'pending,nope,in_progress,completed',
        taskPriority: 'urgent,wrong,low',
        taskAssignee: 'me',
      })
    ).toEqual({
      status: ['pending', 'in_progress', 'completed'],
      priority: ['urgent', 'low'],
      assignee: 'me',
    });

    expect(parseProjectTaskFilters({})).toEqual({
      status: [],
      priority: [],
      assignee: 'all',
    });
  });

  it('parses known sort params and defaults unknown values to due date', () => {
    expect(parseProjectTaskSort('priority')).toBe('priority');
    expect(parseProjectTaskSort('title')).toBe('title');
    expect(parseProjectTaskSort('not-a-sort')).toBe('dueDate');
    expect(parseProjectTaskSort(undefined)).toBe('dueDate');
  });

  it('builds filter search params while preserving tab and current sort', () => {
    expect(
      buildProjectTaskFilterSearch(
        { tab: 'tasks', taskSort: 'priority' },
        {
          status: ['pending', 'blocked'],
          priority: ['urgent'],
          assignee: 'unassigned',
        }
      )
    ).toEqual({
      tab: 'tasks',
      taskStatus: 'pending,blocked',
      taskPriority: 'urgent',
      taskAssignee: 'unassigned',
      taskSort: 'priority',
    });

    expect(
      buildProjectTaskFilterSearch(
        { tab: 'tasks', taskSort: 'title' },
        {
          status: [],
          priority: [],
          assignee: 'all',
        }
      )
    ).toEqual({
      tab: 'tasks',
      taskStatus: undefined,
      taskPriority: undefined,
      taskAssignee: undefined,
      taskSort: 'title',
    });
  });

  it('builds sort search params while preserving current filters', () => {
    const search = {
      tab: 'tasks' as const,
      taskStatus: 'pending,completed',
      taskPriority: 'high',
      taskAssignee: 'me' as const,
    };

    expect(buildProjectTaskSortSearch(search, 'created')).toEqual({
      ...search,
      taskSort: 'created',
    });

    expect(buildProjectTaskSortSearch(search, 'dueDate')).toEqual({
      ...search,
      taskSort: undefined,
    });
  });
});
