/**
 * Job Tasks Kanban Hooks
 *
 * TanStack Query hooks for job tasks kanban board.
 * Provides data fetching and mutation hooks for kanban-specific operations.
 *
 * @see src/hooks/jobs/use-job-tasks.ts for individual task management
 * @see src/server/functions/jobs/job-tasks-kanban.ts for server functions
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-005c
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listJobTasksForKanban,
  type ListJobTasksForKanbanInput,
  type KanbanTask,
} from '@/server/functions/jobs/job-tasks-kanban';

// Re-export the KanbanTask type for use in components
export type { KanbanTask };
import { useUpdateTask } from './use-job-tasks';

// ============================================================================
// KANBAN DATA TYPE
// ============================================================================

export interface KanbanTasksData {
  tasks: KanbanTask[];
  total: number;
}

// ============================================================================
// LIST HOOK
// ============================================================================

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
    queryFn: () => listFn({ data: filters }),
    enabled,
    refetchInterval: 30000, // Poll every 30 seconds for live updates
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 300000, // Keep in cache for 5 minutes

    // Transform data for kanban consumption
    select: (data: { tasks: KanbanTask[]; total: number }) => {
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

// ============================================================================
// MUTATION HOOK
// ============================================================================

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
        // Use existing task update mutation
        await updateTaskMutation.mutateAsync({
          taskId: input.taskId,
          status: input.status,
        });

        // Invalidate kanban queries to refresh the board
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
      // Optimistic update for kanban
      const previousData = queryClient.getQueryData(queryKeys.jobTasks.kanban.list());

      // Apply optimistic update if we have cached data
      if (previousData) {
        queryClient.setQueryData(queryKeys.jobTasks.kanban.list(), (oldData: any) => {
          if (!oldData) return oldData;

          const newAllTasks = oldData.allTasks.map((task: KanbanTask) =>
            task.id === input.taskId ? { ...task, status: input.status } : task
          );

          // Regroup tasks by status
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

      // Perform the actual mutation
      updateTaskMutation.mutate(
        {
          taskId: input.taskId,
          status: input.status,
        },
        {
          onSuccess: () => {
            // Invalidate to ensure fresh data
            queryClient.invalidateQueries({
              queryKey: queryKeys.jobTasks.kanban.all,
            });
            options.onSuccess?.();
          },
          onError: (error) => {
            // Rollback optimistic update on error
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

// ============================================================================
// UTILITY HOOKS
// ============================================================================

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

    // Status transition validation
    canTransition: (from: string, to: string): boolean => {
      // Can't move from blocked status
      if (from === 'blocked') return false;

      // Can't move to blocked from completed
      if (to === 'blocked' && from === 'completed') return false;

      // Allow all other transitions
      return true;
    },

    // Get column display name
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
