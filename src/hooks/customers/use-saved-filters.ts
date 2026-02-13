/**
 * Saved Customer Filters Hook
 *
 * Hook for managing user-saved customer filter presets.
 * Integrates with user preferences system.
 *
 * @example
 * ```tsx
 * const { savedFilters, saveFilter, deleteFilter, isLoading } = useSavedCustomerFilters();
 *
 * // Save current filters
 * await saveFilter({ name: 'My Active Customers', filters: currentFilters });
 *
 * // Delete a saved filter
 * await deleteFilter(savedFilter.id);
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSavedCustomerFilters,
  saveCustomerFilter,
  updateSavedCustomerFilter,
  deleteSavedCustomerFilter,
} from '@/server/functions/customers/saved-filters';
import { queryKeys } from '@/lib/query-keys';
import type { CustomerFiltersState, SavedCustomerFilter } from '@/lib/schemas/customers/saved-filters';

// Re-export type for convenience
export type { SavedCustomerFilter };

// ============================================================================
// QUERY KEY
// ============================================================================

const SAVED_FILTERS_QUERY_KEY = [...queryKeys.customers.all, 'saved-filters'] as const;

// ============================================================================
// HOOK
// ============================================================================

export function useSavedCustomerFilters() {
  const queryClient = useQueryClient();

  // Fetch saved filters - map wire to domain per SCHEMA-TRACE ServerFn boundary
  const {
    data: savedFilters = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: SAVED_FILTERS_QUERY_KEY,
    queryFn: async (): Promise<SavedCustomerFilter[]> => {
      const wire = await getSavedCustomerFilters();
      return wire.map((w) => ({
        ...w,
        filters: w.filters as CustomerFiltersState,
      }));
    },
  });

  // Save new filter
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; filters: CustomerFiltersState }) => {
      return await saveCustomerFilter({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_FILTERS_QUERY_KEY });
      toast.success('Filter saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save filter');
    },
  });

  // Update existing filter
  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      filters?: CustomerFiltersState;
    }) => {
      return await updateSavedCustomerFilter({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_FILTERS_QUERY_KEY });
      toast.success('Filter updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update filter');
    },
  });

  // Delete filter
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteSavedCustomerFilter({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_FILTERS_QUERY_KEY });
      toast.success('Filter deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete filter');
    },
  });

  return {
    savedFilters,
    isLoading,
    error,
    saveFilter: saveMutation.mutateAsync,
    updateFilter: updateMutation.mutateAsync,
    deleteFilter: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
