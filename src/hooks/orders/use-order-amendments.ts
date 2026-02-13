/**
 * Order Amendments Hooks
 *
 * TanStack Query hooks for amendment operations.
 * Provides list, detail, and mutation operations for order amendments.
 *
 * @see src/server/functions/orders/order-amendments.ts for server functions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type { AmendmentStatus, AmendmentType, AmendmentChanges, Amendment } from '@/lib/schemas/orders';
import {
  listAmendments,
  getAmendment,
  requestAmendment,
  approveAmendment,
  rejectAmendment,
  applyAmendment,
  cancelAmendment,
} from '@/server/functions/orders/order-amendments';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAmendmentsOptions {
  orderId: string;
  status?: AmendmentStatus;
  amendmentType?: AmendmentType;
  requestedBy?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'requestedAt' | 'reviewedAt' | 'appliedAt';
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
}

export interface UseAmendmentOptions {
  amendmentId: string;
  enabled?: boolean;
}

export interface RequestAmendmentInput {
  orderId: string;
  amendmentType: AmendmentType;
  reason: string;
  changes: AmendmentChanges;
}

// ============================================================================
// LIST HOOK
// ============================================================================

/**
 * Hook for fetching amendments for an order.
 */
export function useAmendments(options: UseAmendmentsOptions) {
  const {
    orderId,
    status,
    amendmentType,
    requestedBy,
    page = 1,
    pageSize = 20,
    sortBy = 'requestedAt',
    sortOrder = 'desc',
    enabled = true,
  } = options;

  const listAmendmentsFn = useServerFn(listAmendments);

  const filters = {
    orderId,
    status,
    amendmentType,
    requestedBy,
    page,
    pageSize,
    sortBy,
    sortOrder,
  };

  return useQuery({
    queryKey: queryKeys.orders.amendments(orderId),
    queryFn: async () => {
      const result = await listAmendmentsFn({ data: filters });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!orderId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// DETAIL HOOK
// ============================================================================

/**
 * Hook for fetching a single amendment.
 */
export function useAmendment({ amendmentId, enabled = true }: UseAmendmentOptions) {
  const getAmendmentFn = useServerFn(getAmendment);

  return useQuery({
    queryKey: queryKeys.orders.amendmentDetail(amendmentId),
    queryFn: async () => {
      const result = await getAmendmentFn({
        data: { id: amendmentId }
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!amendmentId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook for requesting an amendment.
 */
export function useRequestAmendment() {
  const queryClient = useQueryClient();

  const requestFn = useServerFn(requestAmendment);

  return useMutation({
    mutationFn: (input: RequestAmendmentInput) => requestFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.amendments(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
    },
  });
}

/**
 * Hook for approving an amendment.
 */
export function useApproveAmendment() {
  const queryClient = useQueryClient();

  const approveFn = useServerFn(approveAmendment);

  return useMutation({
    mutationFn: (input: { amendmentId: string; notes?: { note?: string; conditions?: string[]; internalOnly?: boolean } }) =>
      approveFn({ data: input }),
    onSuccess: (result, variables) => {
      const amendment = result as Amendment;
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.amendments(amendment.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.amendmentDetail(variables.amendmentId) });
    },
  });
}

/**
 * Hook for rejecting an amendment.
 */
export function useRejectAmendment() {
  const queryClient = useQueryClient();

  const rejectFn = useServerFn(rejectAmendment);

  return useMutation({
    mutationFn: (input: { amendmentId: string; reason: string }) => rejectFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.amendmentDetail(variables.amendmentId) });
    },
  });
}

/**
 * Hook for applying an approved amendment.
 */
export function useApplyAmendment() {
  const queryClient = useQueryClient();

  const applyFn = useServerFn(applyAmendment);

  return useMutation({
    mutationFn: (input: { amendmentId: string; forceApply?: boolean }) => applyFn({ data: input }),
    onSuccess: (result, variables) => {
      const amendment = result as Amendment;
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(amendment.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.amendments(amendment.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.amendmentDetail(variables.amendmentId) });
    },
  });
}

/**
 * Hook for cancelling an amendment.
 */
export function useCancelAmendment() {
  const queryClient = useQueryClient();

  const cancelFn = useServerFn(cancelAmendment);

  return useMutation({
    mutationFn: (input: { amendmentId: string; reason?: string }) => cancelFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.amendmentDetail(variables.amendmentId) });
    },
  });
}
