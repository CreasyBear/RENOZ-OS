import { useMemo } from 'react';

import {
  useProjectTasks,
  useSiteVisitsByProject,
  useWorkstreams,
} from '@/hooks/jobs';
import { useUserLookup } from '@/hooks/users';
import {
  areAllProjectTasksComplete,
  buildProjectTaskViewModels,
  filterProjectTasks,
  getProjectTaskCounts,
  groupProjectTasksByWorkstream,
  hasProjectTaskActiveFilters,
  sortProjectTasks,
} from './project-task-view-model';
import { useProjectTaskDeleteMutation } from './project-task-delete-mutation';
import { useProjectTaskDialogState } from './project-task-dialog-state';
import { useProjectTaskQuickAdd } from './project-task-quick-add';
import { useProjectTaskReorderMutation } from './project-task-reorder-mutation';
import { useProjectTaskRouteState } from './project-task-route-state';
import { useProjectTaskStatusMutation } from './project-task-status-mutation';

export interface UseProjectTasksTabControllerOptions {
  projectId: string;
  onCompleteProjectClick?: () => void;
}

export function useProjectTasksTabController({
  projectId,
  onCompleteProjectClick,
}: UseProjectTasksTabControllerOptions) {
  const { data: tasksData, error, isLoading, refetch } = useProjectTasks({ projectId });
  const { data: workstreamsData } = useWorkstreams(projectId);
  const { data: siteVisitsData } = useSiteVisitsByProject(projectId);
  const { getUser, currentUserId } = useUserLookup();
  const { filters, sortBy, updateFilters, updateSort } = useProjectTaskRouteState(projectId);

  const siteVisits = useMemo(
    () => siteVisitsData?.items ?? [],
    [siteVisitsData?.items]
  );
  const workstreams = useMemo(
    () => workstreamsData?.data ?? [],
    [workstreamsData?.data]
  );

  const { handleQuickAdd, isQuickAddPending } = useProjectTaskQuickAdd({
    projectId,
    siteVisits,
  });
  const taskDialogs = useProjectTaskDialogState();
  const { pendingDeletions, handleDeleteTask } = useProjectTaskDeleteMutation({
    projectId,
    onDeleted: refetch,
  });

  const allTasks = useMemo(() => {
    return buildProjectTaskViewModels({
      tasks: tasksData || [],
      workstreams,
      siteVisits,
      getUser,
    });
  }, [tasksData, workstreams, siteVisits, getUser]);
  const taskCounts = useMemo(() => getProjectTaskCounts(allTasks), [allTasks]);
  const filteredTasks = useMemo(() => {
    return filterProjectTasks({
      tasks: allTasks,
      filters,
      currentUserId,
      pendingDeletions,
    });
  }, [allTasks, filters, currentUserId, pendingDeletions]);
  const tasks = useMemo(() => {
    return sortProjectTasks(filteredTasks, sortBy);
  }, [filteredTasks, sortBy]);
  const groupedTasks = useMemo(() => {
    return groupProjectTasksByWorkstream({ tasks, workstreams });
  }, [tasks, workstreams]);

  const { handleToggleTask } = useProjectTaskStatusMutation({
    projectId,
    tasks,
    onCompleteProjectClick,
  });
  const { handleReorderTasks } = useProjectTaskReorderMutation({ tasks });

  return {
    allTasks,
    allTasksComplete: areAllProjectTasksComplete(allTasks),
    error,
    filters,
    groupedTasks,
    handleDeleteTask,
    handleQuickAdd,
    handleReorderTasks,
    handleToggleTask,
    hasActiveFilters: hasProjectTaskActiveFilters(filters),
    hasUnavailableTasks: Boolean(error && tasksData === undefined),
    isLoading,
    isQuickAddPending,
    refetch,
    sortBy,
    taskCounts,
    taskDialogs,
    tasks,
    updateFilters,
    updateSort,
  };
}
