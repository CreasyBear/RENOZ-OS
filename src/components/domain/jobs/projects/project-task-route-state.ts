import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

import type {
  JobTaskPriority,
  JobTaskStatus,
  TaskFilters,
  TaskSortOption,
} from '@/lib/schemas/jobs';

type ProjectTaskTabValue =
  | 'overview'
  | 'workstreams'
  | 'schedule'
  | 'tasks'
  | 'bom'
  | 'notes'
  | 'files'
  | 'documents'
  | 'activity';

export interface ProjectTaskSearchState {
  tab?: ProjectTaskTabValue;
  taskStatus?: string;
  taskPriority?: string;
  taskAssignee?: TaskFilters['assignee'];
  taskSort?: TaskSortOption;
}

export interface ProjectTaskRouteState {
  filters: TaskFilters;
  sortBy: TaskSortOption;
  updateFilters: (filters: TaskFilters) => void;
  updateSort: (sort: TaskSortOption) => void;
}

function isProjectTaskStatus(value: string): value is JobTaskStatus {
  return value === 'pending' ||
    value === 'in_progress' ||
    value === 'completed' ||
    value === 'blocked';
}

function isProjectTaskPriority(value: string): value is JobTaskPriority {
  return value === 'urgent' ||
    value === 'high' ||
    value === 'normal' ||
    value === 'low';
}

function isProjectTaskAssignee(value: string | undefined): value is TaskFilters['assignee'] {
  return value === 'all' || value === 'me' || value === 'unassigned';
}

export function parseProjectTaskFilters(search: ProjectTaskSearchState): TaskFilters {
  return {
    status: (search.taskStatus?.split(',').filter(Boolean) || []).filter(isProjectTaskStatus),
    priority: (search.taskPriority?.split(',').filter(Boolean) || []).filter(isProjectTaskPriority),
    assignee: isProjectTaskAssignee(search.taskAssignee) ? search.taskAssignee : 'all',
  };
}

export function parseProjectTaskSort(sort: string | undefined): TaskSortOption {
  if (
    sort === 'dueDate' ||
    sort === 'priority' ||
    sort === 'created' ||
    sort === 'title'
  ) {
    return sort;
  }

  return 'dueDate';
}

export function buildProjectTaskFilterSearch(
  search: ProjectTaskSearchState,
  filters: TaskFilters
): ProjectTaskSearchState {
  return {
    tab: search.tab,
    taskStatus: filters.status.length > 0 ? filters.status.join(',') : undefined,
    taskPriority: filters.priority.length > 0 ? filters.priority.join(',') : undefined,
    taskAssignee: filters.assignee !== 'all' ? filters.assignee : undefined,
    taskSort: search.taskSort,
  };
}

export function buildProjectTaskSortSearch(
  search: ProjectTaskSearchState,
  sort: TaskSortOption
): ProjectTaskSearchState {
  return {
    tab: search.tab,
    taskStatus: search.taskStatus,
    taskPriority: search.taskPriority,
    taskAssignee: search.taskAssignee,
    taskSort: sort !== 'dueDate' ? sort : undefined,
  };
}

export function useProjectTaskRouteState(projectId: string): ProjectTaskRouteState {
  const navigate = useNavigate();
  const search = useSearch({ from: '/_authenticated/projects/$projectId' });

  const searchState: ProjectTaskSearchState = useMemo(
    () => ({
      tab: search.tab,
      taskStatus: search.taskStatus,
      taskPriority: search.taskPriority,
      taskAssignee: search.taskAssignee,
      taskSort: search.taskSort,
    }),
    [search.tab, search.taskStatus, search.taskPriority, search.taskAssignee, search.taskSort]
  );

  const urlFilters = useMemo(
    () => parseProjectTaskFilters(searchState),
    [searchState]
  );
  const urlSortBy = useMemo(
    () => parseProjectTaskSort(searchState.taskSort),
    [searchState.taskSort]
  );

  const [filters, setFilters] = useState<TaskFilters>(urlFilters);
  const [sortBy, setSortBy] = useState<TaskSortOption>(urlSortBy);

  const updateFilters = useCallback((newFilters: TaskFilters) => {
    setFilters(newFilters);
    navigate({
      to: '/projects/$projectId',
      params: { projectId },
      search: buildProjectTaskFilterSearch(searchState, newFilters),
    });
  }, [navigate, projectId, searchState]);

  const updateSort = useCallback((newSort: TaskSortOption) => {
    setSortBy(newSort);
    navigate({
      to: '/projects/$projectId',
      params: { projectId },
      search: buildProjectTaskSortSearch(searchState, newSort),
    });
  }, [navigate, projectId, searchState]);

  return {
    filters,
    sortBy,
    updateFilters,
    updateSort,
  };
}
