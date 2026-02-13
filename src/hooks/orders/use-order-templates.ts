/**
 * Order Templates Hooks
 *
 * TanStack Query hooks for template operations.
 * Provides list, detail, and mutation operations for order templates.
 *
 * @see src/server/functions/orders/order-templates.ts for server functions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  saveOrderAsTemplate,
  createOrderFromTemplate,
  deleteTemplateItem,
} from '@/server/functions/orders/order-templates';

// ============================================================================
// TYPES
// ============================================================================

export interface UseOrderTemplatesOptions {
  search?: string;
  isActive?: boolean;
  category?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'createdAt' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
}

export interface UseOrderTemplateOptions {
  templateId: string;
  enabled?: boolean;
}

// ============================================================================
// LIST HOOK
// ============================================================================

/**
 * Hook for fetching order templates.
 */
export function useOrderTemplates(options: UseOrderTemplatesOptions = {}) {
  const {
    search,
    isActive = true,
    category,
    page = 1,
    pageSize = 50,
    sortBy = 'name',
    sortOrder = 'asc',
    enabled = true,
  } = options;

  const listTemplatesFn = useServerFn(listTemplates);

  const filters = {
    search: search || undefined,
    isActive,
    category,
    page,
    pageSize,
    sortBy,
    sortOrder,
  };

  return useQuery({
    queryKey: queryKeys.orders.templates(search),
    queryFn: async () => {
      const result = await listTemplatesFn({ data: filters });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// DETAIL HOOK
// ============================================================================

/**
 * Hook for fetching a single template with items.
 */
export function useOrderTemplate({ templateId, enabled = true }: UseOrderTemplateOptions) {
  const getTemplateFn = useServerFn(getTemplate);

  return useQuery({
    queryKey: queryKeys.orders.templateDetail(templateId),
    queryFn: async () => {
      const result = await getTemplateFn({
        data: { id: templateId }
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!templateId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook for creating a new template.
 */
export function useCreateOrderTemplate() {
  const queryClient = useQueryClient();

  const createFn = useServerFn(createTemplate);

  return useMutation({
    mutationFn: (input: Parameters<typeof createTemplate>[0]['data']) =>
      createFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.templates() });
    },
  });
}

/**
 * Hook for updating a template.
 */
export function useUpdateOrderTemplate() {
  const queryClient = useQueryClient();

  const updateFn = useServerFn(updateTemplate);

  return useMutation({
    mutationFn: (input: { id: string } & Record<string, unknown>) => updateFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.templates() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.templateDetail(variables.id) });
    },
  });
}

/**
 * Hook for deleting a template.
 */
export function useDeleteOrderTemplate() {
  const queryClient = useQueryClient();

  const deleteFn = useServerFn(deleteTemplate);

  return useMutation({
    mutationFn: (templateId: string) => deleteFn({ data: { id: templateId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.templates() });
    },
  });
}

/**
 * Hook for saving an order as a template.
 */
export function useSaveOrderAsTemplate() {
  const queryClient = useQueryClient();

  const saveFn = useServerFn(saveOrderAsTemplate);

  return useMutation({
    mutationFn: (input: Parameters<typeof saveOrderAsTemplate>[0]['data']) =>
      saveFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.templates() });
    },
  });
}

/**
 * Hook for creating an order from a template.
 */
export function useCreateOrderFromTemplate() {
  const queryClient = useQueryClient();

  const createFn = useServerFn(createOrderFromTemplate);

  return useMutation({
    mutationFn: (input: Parameters<typeof createOrderFromTemplate>[0]['data']) =>
      createFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.templates() });
    },
  });
}

/**
 * Hook for deleting a template item.
 */
export function useDeleteTemplateItem() {
  const queryClient = useQueryClient();

  const deleteFn = useServerFn(deleteTemplateItem);

  return useMutation({
    mutationFn: (itemId: string) => deleteFn({ data: { itemId } }),
    onSuccess: () => {
      // Invalidate both list and detail caches per STANDARDS.md
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.templates() });
    },
  });
}
