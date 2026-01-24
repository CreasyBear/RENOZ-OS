/**
 * Job Tasks Hooks
 *
 * TanStack Query hooks for job task management:
 * - Task list for a job
 * - Task mutations (create, update, delete, reorder)
 *
 * @see src/server/functions/job-tasks.ts for server functions
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-001c
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listJobTasks,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getTask,
} from '@/server/functions/jobs/job-tasks';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  ReorderTasksInput,
  TaskResponse,
} from '@/lib/schemas';

// Query keys are now centralized in @/lib/query-keys.ts

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
    queryFn: () => listJobTasks({ data: { jobId, status } }),
    enabled: enabled && !!jobId,
    staleTime: 30 * 1000, // 30 seconds
    select: (data) => data.tasks,
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
    queryFn: () => getTask({ data: { taskId } }),
    enabled: enabled && !!taskId,
    staleTime: 60 * 1000, // 1 minute
    select: (data) => data.task,
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
      // Invalidate the task list for this job
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTasks.list(variables.jobId),
      });
    },
  });
}

/**
 * Update an existing task.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTaskInput) => updateTask({ data: input }),
    onSuccess: (data) => {
      // Invalidate both the detail and list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTasks.detail(data.task.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobTasks.list(data.task.jobId),
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
