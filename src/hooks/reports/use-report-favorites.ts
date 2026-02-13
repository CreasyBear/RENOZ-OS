/**
 * Report Favorites Hooks
 *
 * TanStack Query hooks for user report favorites:
 * - List favorites with filtering
 * - Create/delete favorites
 * - Bulk delete favorites
 *
 * @see src/server/functions/reports/report-favorites.ts
 * @see src/lib/schemas/reports/report-favorites.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listReportFavorites,
  createReportFavorite,
  deleteReportFavorite,
  bulkDeleteReportFavorites,
} from '@/server/functions/reports';
import type {
  ListReportFavoritesInput,
  CreateReportFavoriteInput,
  DeleteReportFavoriteInput,
  BulkDeleteReportFavoritesInput,
} from '@/lib/schemas/reports/report-favorites';

// ============================================================================
// TYPES
// ============================================================================

export interface UseReportFavoritesOptions extends Partial<ListReportFavoritesInput> {
  enabled?: boolean;
}

// ============================================================================
// LIST HOOKS
// ============================================================================

/**
 * List report favorites with filtering.
 */
export function useReportFavorites(options: UseReportFavoritesOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.reports.reportFavorites.list(filters),
    queryFn: async () => {
      const result = await listReportFavorites({ data: filters as ListReportFavoritesInput });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a report favorite.
 */
export function useCreateReportFavorite() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createReportFavorite);

  return useMutation({
    mutationFn: (input: CreateReportFavoriteInput) => createFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.reportFavorites.lists() });
    },
  });
}

/**
 * Delete a report favorite.
 */
export function useDeleteReportFavorite() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteReportFavorite);

  return useMutation({
    mutationFn: (input: DeleteReportFavoriteInput) => deleteFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.reportFavorites.lists() });
    },
  });
}

/**
 * Bulk delete report favorites.
 */
export function useBulkDeleteReportFavorites() {
  const queryClient = useQueryClient();
  const bulkDeleteFn = useServerFn(bulkDeleteReportFavorites);

  return useMutation({
    mutationFn: (input: BulkDeleteReportFavoritesInput) => bulkDeleteFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.reportFavorites.lists() });
    },
  });
}

// ============================================================================
// TYPES EXPORT
// ============================================================================

export type {
  ListReportFavoritesInput,
  CreateReportFavoriteInput,
  DeleteReportFavoriteInput,
  BulkDeleteReportFavoritesInput,
};
