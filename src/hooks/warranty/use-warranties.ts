'use client'

/**
 * Warranty Hooks
 *
 * Shared hooks for warranty detail updates.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getWarranty, listWarranties, updateWarrantyOptOut } from '@/server/functions/warranty';
import { queryKeys } from '@/lib/query-keys';
import type { WarrantyFilters } from '@/lib/schemas/warranty/warranties';

export interface UseWarrantiesOptions extends Partial<WarrantyFilters> {
  enabled?: boolean;
}

export type WarrantyDetail = NonNullable<Awaited<ReturnType<typeof getWarranty>>>;

export function useWarranties(options: UseWarrantiesOptions = {}) {
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
    queryFn: () => listWarranties({ data: queryFilters }),
    enabled,
  });
}

export interface UseWarrantyOptions {
  id: string;
  enabled?: boolean;
}

export function useWarranty({ id, enabled = true }: UseWarrantyOptions) {
  return useQuery({
    queryKey: queryKeys.warranties.detail(id),
    queryFn: () => getWarranty({ data: { id } }),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

export function useUpdateWarrantyOptOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ warrantyId, optOut }: { warrantyId: string; optOut: boolean }) =>
      updateWarrantyOptOut({ data: { warrantyId, optOut } }),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.warranties.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warranties.detail(variables.warrantyId),
      });
      return result;
    },
  });
}
