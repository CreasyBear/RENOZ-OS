/**
 * Targets Hooks
 *
 * TanStack Query hooks for KPI targets:
 * - List targets with filtering
 * - Target detail
 * - CRUD operations
 * - Target progress tracking
 *
 * @see src/server/functions/reports/targets.ts
 * @see src/lib/schemas/reports/targets.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listTargets,
  getTarget,
  createTarget,
  updateTarget,
  deleteTarget,
  getTargetProgress,
  bulkCreateTargets,
  bulkUpdateTargets,
  bulkDeleteTargets,
} from '@/server/functions/reports';
import type {
  ListTargetsInput,
  CreateTargetInput,
  UpdateTargetInput,
  GetTargetProgressInput,
  BulkCreateTargetsInput,
  BulkUpdateTargetsInput,
  BulkDeleteTargetsInput,
} from '@/lib/schemas/reports/targets';

// ============================================================================
// TYPES
// ============================================================================

export interface UseTargetsOptions extends Partial<ListTargetsInput> {
  enabled?: boolean;
}

export interface UseTargetOptions {
  id: string;
  enabled?: boolean;
}

export interface UseTargetProgressOptions extends Partial<GetTargetProgressInput> {
  enabled?: boolean;
}

// ============================================================================
// LIST HOOKS
// ============================================================================

/**
 * List KPI targets with filtering and pagination.
 */
export function useTargets(options: UseTargetsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.reports.targets.list(filters),
    queryFn: async () => {
      const result = await listTargets({ data: filters as ListTargetsInput });
      if (result == null) throw new Error('Targets list returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

/**
 * Get a single target by ID.
 */
export function useTarget({ id, enabled = true }: UseTargetOptions) {
  return useQuery({
    queryKey: queryKeys.reports.targets.detail(id),
    queryFn: async () => {
      const result = await getTarget({ data: { id } });
      if (result == null) throw new Error('Target not found');
      return result;
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

/**
 * Get progress toward active targets.
 *
 * Uses direct server function call (no useServerFn) per backup pattern -
 * matches working implementation from renoz-v3 6.
 */
export function useTargetProgress(options: UseTargetProgressOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.reports.targets.progress(filters),
    queryFn: async () => {
      const result = await getTargetProgress({ data: filters });
      if (result == null) throw new Error('Target progress returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds - progress data updates frequently
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new KPI target.
 */
export function useCreateTarget() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createTarget);

  return useMutation({
    mutationFn: (input: CreateTargetInput) => createFn({ data: input }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.reports.targets.detail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.targets.lists() });
      // Invalidate progress as new target affects progress calculation
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.targets.progress() });
    },
  });
}

/**
 * Update an existing target.
 */
export function useUpdateTarget() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateTarget);

  return useMutation({
    mutationFn: (input: UpdateTargetInput) => updateFn({ data: input }),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(queryKeys.reports.targets.detail(variables.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.targets.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.targets.progress() });
    },
  });
}

/**
 * Delete a target.
 */
export function useDeleteTarget() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteTarget);

  return useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.reports.targets.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.targets.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.targets.progress() });
    },
  });
}

// ============================================================================
// BULK MUTATION HOOKS
// ============================================================================

/**
 * Bulk create multiple targets.
 */
export function useBulkCreateTargets() {
  const queryClient = useQueryClient();
  const bulkCreateFn = useServerFn(bulkCreateTargets);

  return useMutation({
    mutationFn: (input: BulkCreateTargetsInput) => bulkCreateFn({ data: input }),
    onSuccess: (result) => {
      // Add each created target to cache
      result.targets.forEach((target) => {
        queryClient.setQueryData(queryKeys.reports.targets.detail(target.id), target);
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.targets.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.targets.progress() });
    },
  });
}

/**
 * Bulk update multiple targets.
 */
export function useBulkUpdateTargets() {
  const queryClient = useQueryClient();
  const bulkUpdateFn = useServerFn(bulkUpdateTargets);

  return useMutation({
    mutationFn: (input: BulkUpdateTargetsInput) => bulkUpdateFn({ data: input }),
    onSuccess: (result) => {
      // Update each target in cache
      result.targets.forEach((target) => {
        queryClient.setQueryData(queryKeys.reports.targets.detail(target.id), target);
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.targets.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.targets.progress() });
    },
  });
}

/**
 * Bulk delete multiple targets.
 */
export function useBulkDeleteTargets() {
  const queryClient = useQueryClient();
  const bulkDeleteFn = useServerFn(bulkDeleteTargets);

  return useMutation({
    mutationFn: (input: BulkDeleteTargetsInput) => bulkDeleteFn({ data: input }),
    onSuccess: (result) => {
      // Remove each deleted target from cache
      result.deleted.forEach((id) => {
        queryClient.removeQueries({ queryKey: queryKeys.reports.targets.detail(id) });
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.targets.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.targets.progress() });
    },
  });
}

// ============================================================================
// TYPES EXPORT
// ============================================================================

export type {
  ListTargetsInput,
  CreateTargetInput,
  UpdateTargetInput,
  GetTargetProgressInput,
  BulkCreateTargetsInput,
  BulkUpdateTargetsInput,
  BulkDeleteTargetsInput,
};
