/**
 * RMA (Return Merchandise Authorization) Hooks
 *
 * TanStack Query hooks for RMA management:
 * - RMA list with filters
 * - RMA detail
 * - RMA mutations (create, approve, reject, receive, process)
 *
 * @see src/server/functions/rma.ts for server functions
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listRmas,
  getRma,
  createRma,
  updateRma,
  approveRma,
  rejectRma,
  receiveRma,
  processRma,
  cancelRma,
  bulkApproveRma,
  bulkReceiveRma,
} from '@/server/functions/orders/rma';
import type {
  ListRmasInput,
  CreateRmaInput,
  UpdateRmaInput,
  ApproveRmaInput,
  RejectRmaInput,
  ReceiveRmaInput,
  ProcessRmaInput,
  BulkApproveRmaInput,
  BulkReceiveRmaInput,
} from '@/lib/schemas/support/rma';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// LIST HOOK
// ============================================================================

export interface UseRmasOptions {
  /** Filter by status */
  status?: ListRmasInput['status'];
  /** Filter by reason */
  reason?: ListRmasInput['reason'];
  /** Filter by customer */
  customerId?: string;
  /** Filter by order */
  orderId?: string;
  /** Filter by issue */
  issueId?: string;
  /** Search by RMA number */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Page size */
  pageSize?: number;
  /** Sort field */
  sortBy?: ListRmasInput['sortBy'];
  /** Sort order */
  sortOrder?: ListRmasInput['sortOrder'];
  /** Whether query is enabled */
  enabled?: boolean;
}

/**
 * Fetch paginated list of RMAs with filters.
 */
export function useRmas({
  status,
  reason,
  customerId,
  orderId,
  issueId,
  search,
  page = 1,
  pageSize = 20,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  enabled = true,
}: UseRmasOptions = {}) {
  const filters: Partial<ListRmasInput> = {
    status,
    reason,
    customerId,
    orderId,
    issueId,
    search,
    page,
    pageSize,
    sortBy,
    sortOrder,
  };

  return useQuery({
    queryKey: queryKeys.support.rmasListFiltered(filters),
    queryFn: async () => {
      const result = await listRmas({
        data: {
          ...filters,
          page: page ?? 1,
          pageSize: pageSize ?? 20,
          sortBy: sortBy ?? 'createdAt',
          sortOrder: sortOrder ?? 'desc',
        },
      });
      if (result == null) throw new Error('RMA list returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// DETAIL HOOK
// ============================================================================

export interface UseRmaOptions {
  rmaId: string;
  enabled?: boolean;
}

/**
 * Fetch a single RMA by ID with line items.
 */
export function useRma({ rmaId, enabled = true }: UseRmaOptions) {
  return useQuery({
    queryKey: queryKeys.support.rmaDetail(rmaId),
    queryFn: async () => {
      const result = await getRma({ data: { rmaId } });
      if (result == null) throw new Error('RMA not found');
      return result;
    },
    enabled: enabled && !!rmaId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// CREATE MUTATION
// ============================================================================

/**
 * Create a new RMA.
 */
export function useCreateRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRmaInput) => createRma({ data }),
    onSuccess: () => {
      // Invalidate all RMA lists
      queryClient.invalidateQueries({ queryKey: queryKeys.support.rmasList() });
    },
  });
}

// ============================================================================
// UPDATE MUTATION
// ============================================================================

export interface UpdateRmaMutationInput {
  rmaId: string;
  data: UpdateRmaInput;
}

/**
 * Update an existing RMA.
 */
export function useUpdateRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rmaId, data }: UpdateRmaMutationInput) =>
      updateRma({ data: { rmaId, ...data } }),
    onSuccess: (result) => {
      // Update cache for this RMA
      queryClient.setQueryData(queryKeys.support.rmaDetail(result.id), result);
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.support.rmasList() });
    },
  });
}

// ============================================================================
// WORKFLOW MUTATIONS
// ============================================================================

/**
 * Approve an RMA (requested -> approved).
 */
export function useApproveRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApproveRmaInput) => approveRma({ data }),
    onSuccess: (result) => {
      // Invalidate both list and detail caches per STANDARDS.md
      queryClient.invalidateQueries({ queryKey: queryKeys.support.rmasList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.support.rmaDetail(result.id) });
    },
  });
}

/**
 * Reject an RMA (requested -> rejected).
 */
export function useRejectRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RejectRmaInput) => rejectRma({ data }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.support.rmaDetail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.support.rmasList() });
    },
  });
}

/**
 * Mark RMA as received (approved -> received).
 * Restores inventory; invalidates inventory queries so views refresh.
 */
export function useReceiveRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReceiveRmaInput) => receiveRma({ data }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.support.rmaDetail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.support.rmasList() });
      // Inventory restored; invalidate so lists, details, movements, dashboard refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

/**
 * Bulk approve RMAs (requested -> approved).
 */
export function useBulkApproveRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkApproveRmaInput) => bulkApproveRma({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.rmasList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.support.rmaDetails() });
    },
  });
}

/**
 * Bulk receive RMAs (approved -> received).
 * Restores inventory; invalidates inventory queries.
 */
export function useBulkReceiveRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkReceiveRmaInput) => bulkReceiveRma({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.rmasList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.support.rmaDetails() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

/**
 * Process an RMA with resolution (received -> processed).
 */
export function useProcessRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProcessRmaInput) => processRma({ data }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.support.rmaDetail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.support.rmasList() });
    },
  });
}

// ============================================================================
// CANCEL RMA
// ============================================================================

/**
 * Cancel an RMA (status-based cancellation from requested/approved)
 */
export function useCancelRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; reason?: string }) =>
      cancelRma({ data }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.support.rmaDetail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.support.rmasList() });
    },
  });
}
