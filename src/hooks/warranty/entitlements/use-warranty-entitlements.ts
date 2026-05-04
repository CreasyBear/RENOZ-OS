'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
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
        return await listWarrantyEntitlementsFn({ data: queryFilters });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Warranty entitlements are temporarily unavailable. Please refresh and try again.',
        });
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
        return await getWarrantyEntitlementFn({ data: { id } });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Warranty entitlement details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested warranty entitlement could not be found.',
        });
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
