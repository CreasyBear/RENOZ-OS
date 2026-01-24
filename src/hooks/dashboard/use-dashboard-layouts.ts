/**
 * Dashboard Layouts Hooks
 *
 * TanStack Query hooks for dashboard layout management:
 * - List user layouts
 * - Get user's active layout
 * - CRUD operations for layouts
 * - Available widgets
 *
 * @see src/server/functions/dashboard/layouts.ts
 * @see src/lib/schemas/dashboard/layouts.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listDashboardLayouts,
  getDashboardLayout,
  getUserLayout,
  createDashboardLayout,
  updateDashboardLayout,
  saveDashboardLayout,
  deleteDashboardLayout,
  setDefaultDashboardLayout,
  cloneDashboardLayout,
  getAvailableWidgets,
} from '@/server/functions/dashboard';
import type {
  ListDashboardLayoutsInput,
  CreateDashboardLayoutInput,
  UpdateDashboardLayoutInput,
  SaveDashboardLayoutInput,
  CloneDashboardLayoutInput,
} from '@/lib/schemas/dashboard/layouts';

// ============================================================================
// TYPES
// ============================================================================

export interface UseDashboardLayoutsOptions extends Partial<ListDashboardLayoutsInput> {
  enabled?: boolean;
}

export interface UseDashboardLayoutOptions {
  id: string;
  enabled?: boolean;
}

// ============================================================================
// LIST HOOKS
// ============================================================================

/**
 * List user's dashboard layouts with pagination and filtering.
 */
export function useDashboardLayouts(options: UseDashboardLayoutsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.dashboard.layouts.list(filters),
    queryFn: () => listDashboardLayouts({ data: filters as ListDashboardLayoutsInput }),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

/**
 * Get a single dashboard layout by ID.
 */
export function useDashboardLayout({ id, enabled = true }: UseDashboardLayoutOptions) {
  return useQuery({
    queryKey: queryKeys.dashboard.layouts.detail(id),
    queryFn: () => getDashboardLayout({ data: { id } }),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

/**
 * Get current user's active layout (default or most recent).
 */
export function useUserLayout(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.layouts.userLayout(),
    queryFn: () => getUserLayout(),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Get available widgets for building dashboards.
 */
export function useAvailableWidgets(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.layouts.widgets(),
    queryFn: () => getAvailableWidgets(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - widgets don't change often
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new dashboard layout.
 */
export function useCreateDashboardLayout() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createDashboardLayout);

  return useMutation({
    mutationFn: (input: CreateDashboardLayoutInput) => createFn({ data: input }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.dashboard.layouts.detail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.layouts.lists() });
      // Invalidate user layout in case this was set as default
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.layouts.userLayout() });
    },
  });
}

/**
 * Update an existing dashboard layout.
 */
export function useUpdateDashboardLayout() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateDashboardLayout);

  return useMutation({
    mutationFn: (input: UpdateDashboardLayoutInput) => updateFn({ data: input }),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(queryKeys.dashboard.layouts.detail(variables.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.layouts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.layouts.userLayout() });
    },
  });
}

/**
 * Quick save current layout (updates default layout or creates one).
 */
export function useSaveDashboardLayout() {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveDashboardLayout);

  return useMutation({
    mutationFn: (input: SaveDashboardLayoutInput) => saveFn({ data: input }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.dashboard.layouts.detail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.layouts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.layouts.userLayout() });
    },
  });
}

/**
 * Delete a dashboard layout.
 */
export function useDeleteDashboardLayout() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteDashboardLayout);

  return useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.dashboard.layouts.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.layouts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.layouts.userLayout() });
    },
  });
}

/**
 * Set a layout as the default.
 */
export function useSetDefaultDashboardLayout() {
  const queryClient = useQueryClient();
  const setDefaultFn = useServerFn(setDefaultDashboardLayout);

  return useMutation({
    mutationFn: (id: string) => setDefaultFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.layouts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.layouts.userLayout() });
    },
  });
}

/**
 * Clone an existing layout.
 */
export function useCloneDashboardLayout() {
  const queryClient = useQueryClient();
  const cloneFn = useServerFn(cloneDashboardLayout);

  return useMutation({
    mutationFn: (input: CloneDashboardLayoutInput) => cloneFn({ data: input }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.dashboard.layouts.detail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.layouts.lists() });
    },
  });
}

// ============================================================================
// TYPES EXPORT
// ============================================================================

export type {
  ListDashboardLayoutsInput,
  CreateDashboardLayoutInput,
  UpdateDashboardLayoutInput,
  SaveDashboardLayoutInput,
  CloneDashboardLayoutInput,
};
