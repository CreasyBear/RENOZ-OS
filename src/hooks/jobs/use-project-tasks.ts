/**
 * Project Tasks Hooks
 *
 * TanStack Query hooks for project task management.
 * Fetches tasks across all site visits for a project.
 *
 * SPRINT-03: Hooks for project tasks tab
 *
 * NOTE: Server function moved to src/server/functions/jobs/job-tasks.ts
 * to avoid bundling drizzle into client code.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getProjectTasks } from '@/server/functions/jobs/job-tasks';
import type { GetProjectTasksResponse, ProjectTaskResponse } from '@/lib/schemas/jobs/job-tasks';
import {
  useCreateTask as useBaseCreateTask,
  useUpdateTask as useBaseUpdateTask,
  useDeleteTask as useBaseDeleteTask,
  useUpdateJobTaskStatus as useBaseUpdateJobTaskStatus,
} from './use-job-tasks';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseProjectTasksOptions {
  projectId: string;
  enabled?: boolean;
}

/**
 * Get tasks for a project
 */
export function useProjectTasks({ projectId, enabled = true }: UseProjectTasksOptions) {
  return useQuery<GetProjectTasksResponse, Error, ProjectTaskResponse[]>({
    queryKey: queryKeys.projectTasks.byProject(projectId),
    queryFn: async () => {
      const result = await getProjectTasks({ data: { projectId } });
      if (result == null) throw new Error('Project tasks returned no data');
      return result;
    },
    enabled: enabled && !!projectId,
    staleTime: 30 * 1000, // 30 seconds
    select: (data) => data?.tasks ?? [],
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Update a task with project tasks list and alerts invalidation
 */
export function useUpdateProjectTask(projectId: string) {
  const queryClient = useQueryClient();
  const baseMutation = useBaseUpdateTask();

  return {
    ...baseMutation,
    mutateAsync: async (input: Parameters<typeof baseMutation.mutateAsync>[0]) => {
      const result = await baseMutation.mutateAsync(input);
      // Invalidate project tasks and alerts (blocked_tasks alert depends on task status)
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectTasks.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.alerts(projectId),
      });
      return result;
    },
  };
}

/**
 * Create a task (within a site visit/job)
 */
export { useBaseCreateTask as useCreateTask };

/**
 * Delete a task with project tasks list and alerts invalidation
 */
export function useDeleteProjectTask(projectId: string) {
  const queryClient = useQueryClient();
  const baseMutation = useBaseDeleteTask();

  return {
    ...baseMutation,
    mutateAsync: async (input: Parameters<typeof baseMutation.mutateAsync>[0]) => {
      const result = await baseMutation.mutateAsync(input);
      // Invalidate project tasks and alerts (blocked_tasks alert depends on task count)
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectTasks.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.alerts(projectId),
      });
      return result;
    },
  };
}

/**
 * Update task status with project tasks list and alerts invalidation
 */
export function useUpdateProjectTaskStatus(projectId: string) {
  const queryClient = useQueryClient();
  const baseMutation = useBaseUpdateJobTaskStatus();

  return useMutation({
    mutationFn: baseMutation.mutateAsync,
    onSuccess: () => {
      // Invalidate project tasks and alerts (blocked_tasks alert depends on task status)
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectTasks.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.alerts(projectId),
      });
    },
  });
}

// Re-export base hooks for non-project contexts
export {
  useBaseCreateTask as useCreateTaskBase,
  useBaseUpdateTask as useUpdateTask,
  useBaseDeleteTask as useDeleteTaskBase,
  useBaseUpdateJobTaskStatus as useUpdateJobTaskStatus,
};
