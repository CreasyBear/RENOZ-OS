/**
 * Purchase Order Hooks
 *
 * TanStack Query hooks for purchase order management:
 * - PO list with pagination and filtering
 * - PO detail view
 * - PO lifecycle mutations (create, update, approve, reject)
 * - Line item management
 *
 * @see SUPP-INTEGRATION-API story
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listPurchaseOrders,
  getPurchaseOrderStatusCounts,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  bulkDeletePurchaseOrders,
  submitForApproval,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  markAsOrdered,
  cancelPurchaseOrder,
  closePurchaseOrder,
  addPurchaseOrderItem,
  removePurchaseOrderItem,
} from '@/server/functions/suppliers';
import type { ListPurchaseOrdersInput } from '@/lib/schemas/purchase-orders';

type PurchaseOrderFilters = ListPurchaseOrdersInput;
type CreatePurchaseOrderInput = Parameters<typeof createPurchaseOrder>[0]['data'];
type UpdatePurchaseOrderInput = Parameters<typeof updatePurchaseOrder>[0]['data'];
type DeletePurchaseOrderInput = Parameters<typeof deletePurchaseOrder>[0]['data'];
type SubmitForApprovalInput = Parameters<typeof submitForApproval>[0]['data'];
type ApprovePurchaseOrderInput = Parameters<typeof approvePurchaseOrder>[0]['data'];
type RejectPurchaseOrderInput = Parameters<typeof rejectPurchaseOrder>[0]['data'];
type MarkAsOrderedInput = Parameters<typeof markAsOrdered>[0]['data'];
type CancelPurchaseOrderInput = Parameters<typeof cancelPurchaseOrder>[0]['data'];
type ClosePurchaseOrderInput = Parameters<typeof closePurchaseOrder>[0]['data'];
type AddPurchaseOrderItemInput = Parameters<typeof addPurchaseOrderItem>[0]['data'];
type RemovePurchaseOrderItemInput = Parameters<typeof removePurchaseOrderItem>[0]['data'];

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UsePurchaseOrdersOptions extends Partial<ListPurchaseOrdersInput> {
  enabled?: boolean;
  refetchInterval?: number;
}

export function usePurchaseOrders(options: UsePurchaseOrdersOptions = {}) {
  const { enabled = true, refetchInterval, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.suppliers.purchaseOrdersList(filters),
    queryFn: async () => {
      const result = await listPurchaseOrders({ data: filters as PurchaseOrderFilters });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
    refetchInterval,
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: queryKeys.suppliers.purchaseOrdersPendingApprovals(),
    queryFn: async () => {
      const result = await listPurchaseOrders({
        data: { status: ['pending_approval'], page: 1, pageSize: 100 },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    staleTime: 30 * 1000,
  });
}

// Status counts for filter chips (DOMAIN-LANDING-STANDARDS)
export function usePurchaseOrderStatusCounts() {
  return useQuery({
    queryKey: queryKeys.suppliers.purchaseOrderStatusCounts(),
    queryFn: async () => {
      const result = await getPurchaseOrderStatusCounts();
      if (result == null) throw new Error('Purchase order status counts returned no data');
      return result;
    },
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export function usePurchaseOrder(id: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.suppliers.purchaseOrderDetail(id),
    queryFn: async () => {
      const result = await getPurchaseOrder({
        data: { id } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// CRUD MUTATIONS
// ============================================================================

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchaseOrderInput) => createPurchaseOrder({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderStatusCounts() });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePurchaseOrderInput) => updatePurchaseOrder({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderStatusCounts() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.id),
      });
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeletePurchaseOrderInput) => deletePurchaseOrder({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderStatusCounts() });
    },
  });
}

export function useBulkDeletePurchaseOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { purchaseOrderIds: string[] }) =>
      bulkDeletePurchaseOrders({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderStatusCounts() });
    },
  });
}

// ============================================================================
// WORKFLOW MUTATIONS
// ============================================================================

export function useSubmitForApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitForApprovalInput) => submitForApproval({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderStatusCounts() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrdersPendingApprovals(),
      });
    },
  });
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApprovePurchaseOrderInput) => approvePurchaseOrder({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderStatusCounts() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrdersPendingApprovals(),
      });
    },
  });
}

export function useRejectPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RejectPurchaseOrderInput) => rejectPurchaseOrder({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderStatusCounts() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrdersPendingApprovals(),
      });
    },
  });
}

export function useMarkAsOrdered() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkAsOrderedInput) => markAsOrdered({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderStatusCounts() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.suppliersList() });
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CancelPurchaseOrderInput) => cancelPurchaseOrder({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderStatusCounts() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.id),
      });
    },
  });
}

export function useClosePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClosePurchaseOrderInput) => closePurchaseOrder({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderStatusCounts() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.suppliersList() });
    },
  });
}

// ============================================================================
// LINE ITEM MUTATIONS
// ============================================================================

export function useAddPurchaseOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddPurchaseOrderItemInput) => addPurchaseOrderItem({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.purchaseOrderId),
      });
    },
  });
}

export function useRemovePurchaseOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RemovePurchaseOrderItemInput) => removePurchaseOrderItem({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrders() });
    },
  });
}
