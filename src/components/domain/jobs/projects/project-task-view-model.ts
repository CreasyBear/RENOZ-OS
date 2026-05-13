import { getTaskPriority } from './project-task-config';

import type {
  JobTaskPriority,
  JobTaskStatus,
  ProjectTaskResponse,
  TaskFilters,
  TaskSortOption,
  TaskWithWorkstream,
} from '@/lib/schemas/jobs';

export interface ProjectTaskWorkstreamRef {
  id: string;
  name: string;
}

export interface ProjectTaskSiteVisitRef {
  id: string;
  visitNumber: string;
}

export interface ProjectTaskUserRef {
  name: string | null;
}

export type ProjectTaskUserLookup = (
  userId: string | null | undefined
) => ProjectTaskUserRef | null;

export interface ProjectTaskCounts {
  byStatus: Record<JobTaskStatus, number>;
  byPriority: Record<JobTaskPriority, number>;
}

export type ProjectTaskGroup = [string, TaskWithWorkstream[]];

export function buildProjectTaskViewModels({
  tasks,
  workstreams,
  siteVisits,
  getUser,
}: {
  tasks: readonly ProjectTaskResponse[];
  workstreams: readonly ProjectTaskWorkstreamRef[];
  siteVisits: readonly ProjectTaskSiteVisitRef[];
  getUser: ProjectTaskUserLookup;
}): TaskWithWorkstream[] {
  return tasks.map((task): TaskWithWorkstream => {
    const workstream = workstreams.find(w => w.id === task.workstreamId);
    const assignee = task.assigneeId ? getUser(task.assigneeId) : null;
    const visit = task.siteVisitId ? siteVisits.find(v => v.id === task.siteVisitId) : undefined;
    return {
      ...task,
      workstreamName: workstream?.name,
      assigneeName: assignee?.name ?? undefined,
      siteVisitNumber: visit?.visitNumber,
    };
  });
}

export function getProjectTaskCounts(tasks: readonly TaskWithWorkstream[]): ProjectTaskCounts {
  const byStatus: Record<JobTaskStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    blocked: 0,
  };
  const byPriority: Record<JobTaskPriority, number> = {
    urgent: 0,
    high: 0,
    normal: 0,
    low: 0,
  };

  tasks.forEach(task => {
    byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    const priority = getTaskPriority(task.priority);
    byPriority[priority] = (byPriority[priority] || 0) + 1;
  });

  return { byStatus, byPriority };
}

export function hasProjectTaskActiveFilters(filters: TaskFilters): boolean {
  return filters.status.length > 0 || filters.priority.length > 0 || filters.assignee !== 'all';
}

export function filterProjectTasks({
  tasks,
  filters,
  currentUserId,
  pendingDeletions,
}: {
  tasks: readonly TaskWithWorkstream[];
  filters: TaskFilters;
  currentUserId: string | null;
  pendingDeletions: ReadonlySet<string>;
}): TaskWithWorkstream[] {
  return tasks.filter(task => {
    if (pendingDeletions.has(task.id)) {
      return false;
    }
    if (filters.status.length > 0 && !filters.status.includes(task.status)) {
      return false;
    }
    const taskPriority = getTaskPriority(task.priority);
    if (filters.priority.length > 0 && !filters.priority.includes(taskPriority)) {
      return false;
    }
    if (filters.assignee === 'me' && task.assigneeId !== currentUserId) {
      return false;
    }
    if (filters.assignee === 'unassigned' && task.assigneeId) {
      return false;
    }
    return true;
  });
}

export function sortProjectTasks(
  tasks: readonly TaskWithWorkstream[],
  sortBy: TaskSortOption
): TaskWithWorkstream[] {
  const sorted = [...tasks];

  switch (sortBy) {
    case 'dueDate':
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      break;
    case 'priority': {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      sorted.sort((a, b) => {
        const aPriority = priorityOrder[getTaskPriority(a.priority)];
        const bPriority = priorityOrder[getTaskPriority(b.priority)];
        return aPriority - bPriority;
      });
      break;
    }
    case 'created': {
      sorted.sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
      break;
    }
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }

  return sorted;
}

export function groupProjectTasksByWorkstream({
  tasks,
  workstreams,
}: {
  tasks: readonly TaskWithWorkstream[];
  workstreams: readonly ProjectTaskWorkstreamRef[];
}): ProjectTaskGroup[] {
  const groups = new Map<string, TaskWithWorkstream[]>();

  workstreams.forEach(workstream => {
    groups.set(workstream.name, []);
  });

  groups.set('Unassigned', []);

  tasks.forEach(task => {
    const groupName = task.workstreamName || 'Unassigned';
    const existing = groups.get(groupName) || [];
    existing.push(task);
    groups.set(groupName, existing);
  });

  return Array.from(groups.entries())
    .filter(([, groupTasks]) => groupTasks.length > 0)
    .sort(([a], [b]) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
}

export function areAllProjectTasksComplete(tasks: readonly TaskWithWorkstream[]): boolean {
  return tasks.length > 0 && tasks.every(task => task.status === 'completed');
}
