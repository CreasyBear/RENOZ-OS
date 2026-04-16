'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { normalizeQueryError } from '@/lib/error-handling';
import {
  activateWarrantyFromEntitlement,
  getWarrantyEntitlement,
  listWarrantyEntitlements,
} from '@/server/functions/warranty';
import { queryKeys } from '@/lib/query-keys';
import type {
  ActivateWarrantyFromEntitlementInput,
  WarrantyEntitlementFilters,
} from '@/lib/schemas/warranty/entitlements';

const LIST_STALE_TIME = 30 * 1000;
const DETAIL_STALE_TIME = 60 * 1000;

export function useWarrantyEntitlements(filters: Partial<WarrantyEntitlementFilters> = {}) {
  const listWarrantyEntitlementsFn = useServerFn(listWarrantyEntitlements);
  const queryFilters: WarrantyEntitlementFilters = {
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
    sortBy: filters.sortBy ?? 'deliveredAt',
    sortOrder: filters.sortOrder ?? 'desc',
    ...filters,
  };

  return useQuery({
    queryKey: queryKeys.warrantyEntitlements.list(queryFilters),
    queryFn: async () => {
      try {
        const result = await listWarrantyEntitlementsFn({ data: queryFilters });
        if (result == null) throw new Error('Warranty entitlements query returned no data');
        return result;
      } catch (error) {
        throw normalizeQueryError(
          error,
          'Warranty entitlements are temporarily unavailable. Please refresh and try again.'
        );
      }
    },
    staleTime: LIST_STALE_TIME,
  });
}

export function useWarrantyEntitlement(id: string, enabled = true) {
  const getWarrantyEntitlementFn = useServerFn(getWarrantyEntitlement);
  return useQuery({
    queryKey: queryKeys.warrantyEntitlements.detail(id),
    queryFn: async () => {
      try {
        const result = await getWarrantyEntitlementFn({ data: { id } });
        if (result == null) throw new Error('Warranty entitlement query returned no data');
        return result;
      } catch (error) {
        throw normalizeQueryError(
          error,
          'Warranty entitlement details are temporarily unavailable. Please refresh and try again.'
        );
      }
    },
    enabled: enabled && !!id,
    staleTime: DETAIL_STALE_TIME,
  });
}

export function useActivateWarrantyFromEntitlement() {
  const queryClient = useQueryClient();
  const activateWarrantyFromEntitlementFn = useServerFn(activateWarrantyFromEntitlement);

  return useMutation({
    mutationFn: (input: ActivateWarrantyFromEntitlementInput) =>
      activateWarrantyFromEntitlementFn({ data: input }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warrantyEntitlements.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.all });
      toast.success(result.message ?? 'Warranty activated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to activate warranty');
    },
  });
}
