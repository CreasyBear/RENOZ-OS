/**
 * Job Tasks Hooks
 *
 * TanStack Query hooks for job task management and kanban board operations.
 * Provides data fetching and mutation hooks for task CRUD and kanban-specific operations.
 *
 * @see src/server/functions/jobs/job-tasks.ts
 * @see src/server/functions/jobs/job-tasks-kanban.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listJobTasks,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getTask,
} from '@/server/functions/jobs/job-tasks';
import {
  listJobTasksForKanban,
  getMyTasksForKanban,
} from '@/server/functions/jobs/job-tasks-kanban';
import type {
  KanbanTask,
  ListJobTasksForKanbanInput,
  GetMyTasksForKanbanInput,
} from '@/lib/schemas/jobs/job-tasks-kanban';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  ReorderTasksInput,
  TaskResponse,
  MyTaskKanban,
} from '@/lib/schemas';

// Re-export the KanbanTask type for use in components
export type { KanbanTask };
// Re-export MyTaskKanban from schemas
export type { MyTaskKanban };

// ============================================================================
// LIST HOOK
// ============================================================================

export interface UseJobTasksOptions {
  jobId: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked';
  enabled?: boolean;
}

/**
 * Fetch tasks for a job assignment.
 * Returns tasks ordered by position for drag-drop reordering.
 */
export function useJobTasks({ jobId, status, enabled = true }: UseJobTasksOptions) {
  return useQuery({
    queryKey: queryKeys.jobTasks.list(jobId),
    queryFn: async () => {
      const result = await listJobTasks({ data: { jobId, status } });
      if (result == null) throw new Error('Job tasks returned no data');
      return result;
    },
    enabled: enabled && !!jobId,
    staleTime: 30 * 1000, // 30 seconds
    select: (data) => data?.tasks ?? [],
  });
}

// ============================================================================
// DETAIL HOOK
// ============================================================================

export interface UseJobTaskOptions {
  taskId: string;
  enabled?: boolean;
}

/**
 * Fetch a single task by ID.
 */
export function useJobTask({ taskId, enabled = true }: UseJobTaskOptions) {
  return useQuery({
    queryKey: queryKeys.jobTasks.detail(taskId),
    queryFn: async () => {
      const result = await getTask({ data: { taskId } });
      if (result == null) throw new Error('Task not found');
      return result;
    },
    enabled: enabled && !!taskId,
    staleTime: 60 * 1000, // 1 minute
    select: (data) => data?.task ?? null,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new task within a job.
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask({ data: input }),
    onSuccess: (_data, variables) => {
      // Invalidate the task list for this job or site visit
      if (variables.jobId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.jobTasks.list(variables.jobId),
        });
      }
      // Invalidate project tasks if this is a project-level or site visit task
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectTasks.byProject(variables.projectId),
        });
      }
      if (variables.siteVisitId) {
        queryClient.invalidateQueries({
          queryKey: ['projectTasks', 'siteVisit', variables.siteVisitId],
        });
      }
    },
  });
}

/**
 * Update an existing task.
 *
 * Uses optimistic updates pattern per STANDARDS.md Section 3.
 * Invalidates both detail and list queries, plus myTasks queries for cross-project views.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTaskInput) => updateTask({ data: input }),
    onMutate: async (input) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.jobTasks.myTasks.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.jobTasks.detail(input.taskId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.jobTasks.lists() });

      // Snapshot previous values for rollback
      const previousMyTasks = queryClient.getQueriesData({
        queryKey: queryKeys.jobTasks.myTasks.all,
      });
      const previousDetail = queryClient.getQueryData(
        queryKeys.jobTasks.detail(input.taskId)
      );
      const previousLists = queryClient.getQueriesData({
        queryKey: queryKeys.jobTasks.lists(),
      });

      // Optimistically update myTasks queries
      queryClient.setQueriesData<{
        allTasks: MyTaskKanban[];
        tasksByStatus: Record<string, MyTaskKanban[]>;
        total: number;
      }>(
        { queryKey: queryKeys.jobTasks.myTasks.all },
        (oldData) => {
          if (!oldData) return oldData;

          const updatedTasks = oldData.allTasks.map((task): MyTaskKanban =>
            task.id === input.taskId
              ? { ...task, status: input.status ?? task.status }
              : task
          );

          // Regroup by status
          const tasksByStatus: Record<string, MyTaskKanban[]> = {
            pending: [],
            in_progress: [],
            completed: [],
            blocked: [],
          };

          updatedTasks.forEach((task) => {
            const status = task.status as keyof typeof tasksByStatus;
            if (status && tasksByStatus[status]) {
              tasksByStatus[status].push(task);
            }
          });

          return {
            ...oldData,
            allTasks: updatedTasks,
            tasksByStatus,
          };
        }
      );

      return { previousMyTasks, previousDetail, previousLists };
    },
    onError: (_err, input, context) => {
      // Rollback on error
      if (context?.previousMyTasks) {
        context.previousMyTasks.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(
          queryKeys.jobTasks.detail(input.taskId),
          context.previousDetail
        );
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: (data) => {
      // Invalidate queries to ensure consistency
      if (data) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.jobTasks.detail(data.task.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.jobTasks.list(data.task.jobId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTasks.myTasks.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTasks.lists(),
      });
    },
  });
}

/**
 * Delete a task from a job.
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId }: { taskId: string; jobId: string }) => deleteTask({ data: { taskId } }),
    onSuccess: (_data, variables) => {
      // Invalidate the task list for this job
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTasks.list(variables.jobId),
      });
    },
  });
}

/**
 * Reorder tasks within a job (for drag-drop).
 */
export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReorderTasksInput) => reorderTasks({ data: input }),
    // Optimistic update for smooth drag-drop experience
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.jobTasks.list(variables.jobId),
      });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<{ tasks: TaskResponse[] }>(
        queryKeys.jobTasks.list(variables.jobId)
      );

      // Optimistically update to new order
      if (previousTasks) {
        const taskMap = new Map(previousTasks.tasks.map((t) => [t.id, t]));
        const reorderedTasks = variables.taskIds
          .map((id, index) => {
            const task = taskMap.get(id);
            return task ? { ...task, position: index } : null;
          })
          .filter((t): t is TaskResponse => t !== null);

        queryClient.setQueryData(queryKeys.jobTasks.list(variables.jobId), {
          tasks: reorderedTasks,
        });
      }

      // Return context with the snapshotted value
      return { previousTasks };
    },
    // On error, roll back to the previous value
    onError: (_err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.jobTasks.list(variables.jobId), context.previousTasks);
      }
    },
    // Always refetch after error or success
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTasks.list(variables.jobId),
      });
    },
  });
}

/**
 * Toggle task completion status (convenience hook).
 */
export function useToggleTaskStatus() {
  const updateTaskMutation = useUpdateTask();

  return useMutation({
    mutationFn: ({ taskId, currentStatus }: { taskId: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      return updateTaskMutation.mutateAsync({
        taskId,
        status: newStatus as 'pending' | 'in_progress' | 'completed' | 'blocked',
      });
    },
  });
}

// ============================================================================
// KANBAN VIEW HOOKS
// ============================================================================

export interface KanbanTasksData {
  tasks: KanbanTask[];
  total: number;
}

export interface UseJobTasksKanbanOptions extends Partial<ListJobTasksForKanbanInput> {
  enabled?: boolean;
}

/**
 * Get all job tasks across all assignments for kanban board display.
 * Provides real-time polling and data transformation for kanban UI.
 */
export function useJobTasksKanban(options: UseJobTasksKanbanOptions = {}) {
  const listFn = useServerFn(listJobTasksForKanban);

  const { status, priority, assigneeId, limit = 200, enabled = true } = options;

  const filters: ListJobTasksForKanbanInput = {
    status,
    priority,
    assigneeId,
    limit,
  };

  return useQuery({
    queryKey: queryKeys.jobTasks.kanban.list(filters),
    queryFn: async () => {
      const result = await listFn({ data: filters });
      if (result == null) throw new Error('Job tasks kanban returned no data');
      return result;
    },
    enabled,
    refetchInterval: 30000, // Poll every 30 seconds for live updates
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 300000, // Keep in cache for 5 minutes

    // Transform data for kanban consumption
    select: (data: { tasks: KanbanTask[]; total: number } | null) => {
      if (!data) {
        return {
          tasksByStatus: { pending: [], in_progress: [], completed: [], blocked: [] },
          allTasks: [],
          total: 0,
          filters,
        };
      }
      // Group tasks by status for kanban columns
      const tasksByStatus: Record<string, KanbanTask[]> = {
        pending: [],
        in_progress: [],
        completed: [],
        blocked: [],
      };

      data.tasks.forEach((task) => {
        if (tasksByStatus[task.status]) {
          tasksByStatus[task.status].push(task);
        }
      });

      // Sort tasks within each column by position
      Object.keys(tasksByStatus).forEach((status) => {
        tasksByStatus[status].sort((a, b) => a.position - b.position);
      });

      return {
        tasksByStatus,
        allTasks: data.tasks,
        total: data.total,
        filters,
      };
    },
  });
}

export interface UseUpdateJobTaskStatusOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Update job task status for kanban drag-drop operations.
 * Uses existing useUpdateTask mutation with kanban-specific invalidation.
 */
export function useUpdateJobTaskStatus(options: UseUpdateJobTaskStatusOptions = {}) {
  const updateTaskMutation = useUpdateTask();
  const queryClient = useQueryClient();

  return {
    ...updateTaskMutation,

    mutateAsync: async (input: { taskId: string; status: KanbanTask['status'] }) => {
      try {
        await updateTaskMutation.mutateAsync({
          taskId: input.taskId,
          status: input.status,
        });

        await queryClient.invalidateQueries({
          queryKey: queryKeys.jobTasks.kanban.all,
        });

        options.onSuccess?.();
      } catch (error) {
        options.onError?.(error as Error);
        throw error;
      }
    },

    mutate: (input: { taskId: string; status: KanbanTask['status'] }) => {
      const previousData = queryClient.getQueryData(queryKeys.jobTasks.kanban.list());

      if (previousData) {
        queryClient.setQueryData(queryKeys.jobTasks.kanban.list(), (oldData: {
          tasksByStatus: Record<string, KanbanTask[]>;
          allTasks: KanbanTask[];
          total: number;
          filters: ListJobTasksForKanbanInput;
        } | undefined) => {
          if (!oldData) return oldData;

          const newAllTasks = oldData.allTasks.map((task: KanbanTask) =>
            task.id === input.taskId ? { ...task, status: input.status } : task
          );

          const regrouped: Record<string, KanbanTask[]> = {
            pending: [],
            in_progress: [],
            completed: [],
            blocked: [],
          };

          newAllTasks.forEach((task: KanbanTask) => {
            if (regrouped[task.status]) {
              regrouped[task.status].push(task);
            }
          });

          return {
            ...oldData,
            tasksByStatus: regrouped,
            allTasks: newAllTasks,
          };
        });
      }

      updateTaskMutation.mutate(
        {
          taskId: input.taskId,
          status: input.status,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: queryKeys.jobTasks.kanban.all,
            });
            options.onSuccess?.();
          },
          onError: (error) => {
            if (previousData) {
              queryClient.setQueryData(queryKeys.jobTasks.kanban.list(), previousData);
            }
            options.onError?.(error as Error);
          },
        }
      );
    },
  };
}

/**
 * Get kanban column configuration and status validation rules.
 */
export function useJobTaskKanbanConfig() {
  return {
    columns: [
      { id: 'pending', name: 'Pending', color: 'gray' },
      { id: 'in_progress', name: 'In Progress', color: 'blue' },
      { id: 'completed', name: 'Completed', color: 'green' },
      { id: 'blocked', name: 'Blocked', color: 'red' },
    ] as const,

    canTransition: (from: string, to: string): boolean => {
      if (from === 'blocked') return false;
      if (to === 'blocked' && from === 'completed') return false;
      return true;
    },

    getColumnName: (status: string): string => {
      const column = [
        { id: 'pending', name: 'Pending' },
        { id: 'in_progress', name: 'In Progress' },
        { id: 'completed', name: 'Completed' },
        { id: 'blocked', name: 'Blocked' },
      ].find((col) => col.id === status);
      return column?.name || status;
    },
  };
}

// ============================================================================
// MY TASKS KANBAN (CROSS-PROJECT)
// ============================================================================

export interface UseMyTasksKanbanOptions extends Partial<GetMyTasksForKanbanInput> {
  enabled?: boolean;
}

/**
 * Get current user's tasks across all projects for kanban board display.
 * Used by /my-tasks route for cross-project task view.
 *
 * @example
 * ```tsx
 * const { tasksByStatus, tasksByProject, isLoading } = useMyTasksKanban({
 *   projectId: optionalProjectFilter,
 * });
 * ```
 */
export function useMyTasksKanban(options: UseMyTasksKanbanOptions = {}) {
  const listFn = useServerFn(getMyTasksForKanban);

  const { projectId, status, priority, limit = 200, enabled = true } = options;

  const filters: GetMyTasksForKanbanInput = {
    projectId,
    status,
    priority,
    limit,
  };

  return useQuery({
    queryKey: queryKeys.jobTasks.myTasks.list(filters),
    queryFn: async () => {
      const result = await listFn({ data: filters });
      if (result == null) throw new Error('My tasks kanban returned no data');
      return result;
    },
    enabled,
    refetchInterval: (_query) => {
      // Smart polling: only poll when tab is visible
      return document.visibilityState === 'visible' ? 30000 : false;
    },
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 300000, // Keep in cache for 5 minutes

    // Transform data for kanban consumption
    select: (data: { tasks: MyTaskKanban[]; total: number } | null) => {
      if (!data) {
        return {
          tasksByStatus: { pending: [], in_progress: [], completed: [], blocked: [] },
          tasksByProject: [],
          allTasks: [],
          total: 0,
          filters,
        };
      }
      // Group tasks by status for kanban columns
      const tasksByStatus: Record<string, MyTaskKanban[]> = {
        pending: [],
        in_progress: [],
        completed: [],
        blocked: [],
      };

      // Group tasks by project for project-grouped view
      const tasksByProject: Record<string, {
        project: MyTaskKanban['project'];
        tasks: MyTaskKanban[]
      }> = {};

      data.tasks.forEach((task) => {
        // Group by status
        if (tasksByStatus[task.status]) {
          tasksByStatus[task.status].push(task);
        }

        // Group by project
        if (!tasksByProject[task.project.id]) {
          tasksByProject[task.project.id] = {
            project: task.project,
            tasks: [],
          };
        }
        tasksByProject[task.project.id].tasks.push(task);
      });

      // Sort tasks within each status column by due date, then position
      Object.keys(tasksByStatus).forEach((statusKey) => {
        tasksByStatus[statusKey].sort((a, b) => {
          // Due date first (nulls last)
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          if (a.dueDate && !b.dueDate) return -1;
          if (!a.dueDate && b.dueDate) return 1;
          // Then by position
          return a.position - b.position;
        });
      });

      return {
        tasksByStatus,
        tasksByProject: Object.values(tasksByProject),
        allTasks: data.tasks,
        total: data.total,
        filters,
      };
    },
  });
}
