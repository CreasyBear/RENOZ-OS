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
  removeBomItems,
  updateBomItemsStatus,
  importBomFromCsv,
  importBomFromOrder,
} from '@/server/functions/project-bom';
import type { GetProjectBomResponse } from '@/lib/schemas/jobs/project-bom';

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
  return useQuery<GetProjectBomResponse>({
    queryKey: queryKeys.projects.bom(projectId),
    queryFn: async () => {
      const result = await getProjectBom({
        data: { projectId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
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
      // Invalidate alerts (bom_items_pending alert depends on BOM item count)
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.alerts(projectId),
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
      // Invalidate alerts (bom_items_pending alert depends on quantityOrdered)
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.alerts(projectId),
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
      // Invalidate alerts (bom_items_pending alert depends on BOM item count)
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.alerts(projectId),
      });
    },
  });
}

/**
 * Remove multiple BOM items (batch)
 */
export function useRemoveBomItems(projectId: string) {
  const queryClient = useQueryClient();
  const removeFn = useServerFn(removeBomItems);

  return useMutation({
    mutationFn: (params: { data: { itemIds: string[] } }) => removeFn(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.bom(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.alerts(projectId),
      });
    },
  });
}

/**
 * Update status for multiple BOM items
 */
export function useUpdateBomItemsStatus(projectId: string) {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateBomItemsStatus);

  return useMutation({
    mutationFn: (params: {
      data: { itemIds: string[]; status: 'planned' | 'ordered' | 'received' | 'allocated' | 'installed' };
    }) => updateFn(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.bom(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.alerts(projectId),
      });
    },
  });
}

/**
 * Import BOM from CSV
 * CSV format: sku,quantity[,unitCost] (header row optional)
 */
export function useImportBomFromCsv(projectId: string) {
  const queryClient = useQueryClient();
  const importFn = useServerFn(importBomFromCsv);

  return useMutation({
    mutationFn: (csvContent: string) =>
      importFn({ data: { projectId, csvContent } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.bom(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.alerts(projectId),
      });
    },
  });
}

/**
 * Import BOM from linked project order
 */
export function useImportBomFromOrder(projectId: string) {
  const queryClient = useQueryClient();
  const importFn = useServerFn(importBomFromOrder);

  return useMutation({
    mutationFn: () => importFn({ data: { projectId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.bom(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.alerts(projectId),
      });
    },
  });
}
