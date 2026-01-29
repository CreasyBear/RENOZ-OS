/**
 * Project Workstreams Hooks
 *
 * TanStack Query hooks for project workstreams management.
 *
 * @path src/hooks/jobs/use-workstreams.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listWorkstreams,
  getWorkstream,
  createWorkstream,
  updateWorkstream,
  deleteWorkstream,
  reorderWorkstreams,
} from '@/server/functions/workstreams';
import type {
  CreateWorkstreamInput,
  UpdateWorkstreamInput,
} from '@/lib/schemas/jobs/workstreams-notes';

// ============================================================================
// LIST HOOKS
// ============================================================================

export function useWorkstreams(projectId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.projectWorkstreams.byProject(projectId),
    queryFn: () => listWorkstreams({ data: { projectId } }),
    enabled: options.enabled ?? !!projectId,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export function useWorkstream(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.projectWorkstreams.detail(id),
    queryFn: () => getWorkstream({ data: { id } }),
    enabled: options.enabled ?? !!id,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateWorkstream(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreateWorkstreamInput, 'projectId'>) =>
      createWorkstream({ data: { ...data, projectId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectWorkstreams.byProject(projectId),
      });
    },
  });
}

export function useUpdateWorkstream(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateWorkstreamInput) =>
      updateWorkstream({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectWorkstreams.byProject(projectId),
      });
      if (result?.data?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectWorkstreams.detail(result.data.id),
        });
      }
    },
  });
}

export function useDeleteWorkstream(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWorkstream({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectWorkstreams.byProject(projectId),
      });
    },
  });
}

export function useReorderWorkstreams(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workstreamIds: string[]) =>
      reorderWorkstreams({ data: { projectId, workstreamIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectWorkstreams.byProject(projectId),
      });
    },
  });
}
