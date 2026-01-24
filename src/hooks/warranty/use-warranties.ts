/**
 * Warranty Hooks
 *
 * Shared hooks for warranty detail updates.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listWarranties, updateWarrantyOptOut } from '@/server/functions/warranty/warranties';
import { queryKeys } from '@/lib/query-keys';
import type { WarrantyFilters } from '@/lib/schemas/warranty/warranties';

export interface UseWarrantiesOptions extends Partial<WarrantyFilters> {
  enabled?: boolean;
}

export function useWarranties(options: UseWarrantiesOptions = {}) {
  const listFn = useServerFn(listWarranties);
  const { enabled = true, ...filters } = options;

  const queryFilters: WarrantyFilters = {
    limit: filters.limit ?? 20,
    offset: filters.offset ?? 0,
    sortBy: filters.sortBy ?? 'expiryDate',
    sortOrder: filters.sortOrder ?? 'asc',
    ...filters,
  };

  return useQuery({
    queryKey: queryKeys.warranties.list(queryFilters),
    queryFn: () => listFn({ data: queryFilters }),
    enabled,
  });
}

export function useUpdateWarrantyOptOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ warrantyId, optOut }: { warrantyId: string; optOut: boolean }) =>
      updateWarrantyOptOut({ data: { warrantyId, optOut } }),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.warranties.detail(variables.warrantyId),
      });
      return result;
    },
  });
}
