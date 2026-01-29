/**
 * Project BOM Hooks
 *
 * TanStack Query hooks for project bill of materials.
 *
 * SPRINT-03: Hooks for project BOM tab
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  getProjectBom,
  createProjectBom,
  addBomItem,
  updateBomItem,
  removeBomItem,
} from '@/server/functions/project-bom';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseProjectBomOptions {
  projectId: string;
  enabled?: boolean;
}

/**
 * Get project BOM with items
 */
export function useProjectBom({ projectId, enabled = true }: UseProjectBomOptions) {
  return useQuery({
    queryKey: queryKeys.projects.bom(projectId),
    queryFn: () => getProjectBom({ data: { projectId } }),
    enabled: enabled && !!projectId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a project BOM
 */
export function useCreateProjectBom(projectId: string) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createProjectBom);

  return useMutation({
    mutationFn: (title?: string) => createFn({ data: { projectId, title } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.bom(projectId),
      });
    },
  });
}

/**
 * Add item to BOM
 */
export function useAddBomItem(projectId: string) {
  const queryClient = useQueryClient();
  const addFn = useServerFn(addBomItem);

  return useMutation({
    mutationFn: addFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.bom(projectId),
      });
    },
  });
}

/**
 * Update BOM item
 */
export function useUpdateBomItem(projectId: string) {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateBomItem);

  return useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.bom(projectId),
      });
    },
  });
}

/**
 * Remove item from BOM
 */
export function useRemoveBomItem(projectId: string) {
  const queryClient = useQueryClient();
  const removeFn = useServerFn(removeBomItem);

  return useMutation({
    mutationFn: removeFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.bom(projectId),
      });
    },
  });
}
