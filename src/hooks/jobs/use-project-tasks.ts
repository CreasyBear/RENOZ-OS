/**
 * Project Tasks Hooks
 *
 * TanStack Query hooks for project task management.
 * Fetches tasks across all site visits for a project.
 *
 * SPRINT-03: Hooks for project tasks tab
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { db } from '@/lib/db';
import { jobTasks, siteVisits } from 'drizzle/schema';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { z } from 'zod';
import {
  useCreateTask as useBaseCreateTask,
  useUpdateTask as useBaseUpdateTask,
  useDeleteTask as useBaseDeleteTask,
  useUpdateJobTaskStatus as useBaseUpdateJobTaskStatus,
} from './use-job-tasks';

// ============================================================================
// SERVER FUNCTION
// ============================================================================

/**
 * Get tasks for a project (across all site visits)
 */
export const getProjectTasks = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.job.read });

    // Get all site visits for this project
    const visits = await db
      .select({ id: siteVisits.id })
      .from(siteVisits)
      .where(
        and(
          eq(siteVisits.projectId, data.projectId),
          eq(siteVisits.organizationId, ctx.organizationId)
        )
      );

    const visitIds = visits.map((v) => v.id);

    if (visitIds.length === 0) {
      return { tasks: [] };
    }

    // Get tasks for these site visits
    const tasks = await db
      .select()
      .from(jobTasks)
      .where(
        and(
          inArray(jobTasks.siteVisitId, visitIds),
          eq(jobTasks.organizationId, ctx.organizationId)
        )
      )
      .orderBy(asc(jobTasks.position));

    return { tasks };
  });

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
  return useQuery({
    queryKey: queryKeys.projectTasks.byProject(projectId),
    queryFn: () => getProjectTasks({ data: { projectId } }),
    enabled: enabled && !!projectId,
    staleTime: 30 * 1000, // 30 seconds
    select: (data) => data.tasks,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Update a task with project tasks list invalidation
 */
export function useUpdateProjectTask(projectId: string) {
  const queryClient = useQueryClient();
  const baseMutation = useBaseUpdateTask();

  return {
    ...baseMutation,
    mutateAsync: async (input: Parameters<typeof baseMutation.mutateAsync>[0]) => {
      const result = await baseMutation.mutateAsync(input);
      // Invalidate project tasks
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectTasks.byProject(projectId),
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
 * Delete a task with project tasks list invalidation
 */
export function useDeleteProjectTask(projectId: string) {
  const queryClient = useQueryClient();
  const baseMutation = useBaseDeleteTask();

  return {
    ...baseMutation,
    mutateAsync: async (input: Parameters<typeof baseMutation.mutateAsync>[0]) => {
      const result = await baseMutation.mutateAsync(input);
      // Invalidate project tasks
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectTasks.byProject(projectId),
      });
      return result;
    },
  };
}

/**
 * Update task status with project tasks list invalidation
 */
export function useUpdateProjectTaskStatus(projectId: string) {
  const queryClient = useQueryClient();
  const baseMutation = useBaseUpdateJobTaskStatus();

  return useMutation({
    mutationFn: baseMutation.mutateAsync,
    onSuccess: () => {
      // Invalidate project tasks
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectTasks.byProject(projectId),
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
