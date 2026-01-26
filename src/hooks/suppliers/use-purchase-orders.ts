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
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
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
}

export function usePurchaseOrders(options: UsePurchaseOrdersOptions = {}) {
  const { enabled = true, ...filters } = options;
  const listFn = useServerFn(listPurchaseOrders);

  return useQuery({
    queryKey: queryKeys.suppliers.purchaseOrdersList(filters),
    queryFn: () => listFn({ data: filters as PurchaseOrderFilters }),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function usePendingApprovals() {
  const listFn = useServerFn(listPurchaseOrders);

  return useQuery({
    queryKey: queryKeys.suppliers.purchaseOrdersPendingApprovals(),
    queryFn: () =>
      listFn({
        data: { status: 'pending_approval', page: 1, pageSize: 100 } as PurchaseOrderFilters,
      }),
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export function usePurchaseOrder(id: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const getFn = useServerFn(getPurchaseOrder);

  return useQuery({
    queryKey: queryKeys.suppliers.purchaseOrderDetail(id),
    queryFn: () => getFn({ data: { id } }),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// CRUD MUTATIONS
// ============================================================================

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createPurchaseOrder);

  return useMutation({
    mutationFn: (data: CreatePurchaseOrderInput) => createFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updatePurchaseOrder);

  return useMutation({
    mutationFn: (data: UpdatePurchaseOrderInput) => updateFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.id),
      });
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deletePurchaseOrder);

  return useMutation({
    mutationFn: (data: DeletePurchaseOrderInput) => deleteFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
    },
  });
}

// ============================================================================
// WORKFLOW MUTATIONS
// ============================================================================

export function useSubmitForApproval() {
  const queryClient = useQueryClient();
  const submitFn = useServerFn(submitForApproval);

  return useMutation({
    mutationFn: (data: SubmitForApprovalInput) => submitFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
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
  const approveFn = useServerFn(approvePurchaseOrder);

  return useMutation({
    mutationFn: (data: ApprovePurchaseOrderInput) => approveFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
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
  const rejectFn = useServerFn(rejectPurchaseOrder);

  return useMutation({
    mutationFn: (data: RejectPurchaseOrderInput) => rejectFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
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
  const markFn = useServerFn(markAsOrdered);

  return useMutation({
    mutationFn: (data: MarkAsOrderedInput) => markFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.id),
      });
      // Update supplier stats when order is placed
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.suppliersList() });
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();
  const cancelFn = useServerFn(cancelPurchaseOrder);

  return useMutation({
    mutationFn: (data: CancelPurchaseOrderInput) => cancelFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.id),
      });
    },
  });
}

export function useClosePurchaseOrder() {
  const queryClient = useQueryClient();
  const closeFn = useServerFn(closePurchaseOrder);

  return useMutation({
    mutationFn: (data: ClosePurchaseOrderInput) => closeFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.id),
      });
      // Update supplier performance when order is closed
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.suppliersList() });
    },
  });
}

// ============================================================================
// LINE ITEM MUTATIONS
// ============================================================================

export function useAddPurchaseOrderItem() {
  const queryClient = useQueryClient();
  const addFn = useServerFn(addPurchaseOrderItem);

  return useMutation({
    mutationFn: (data: AddPurchaseOrderItemInput) => addFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.purchaseOrderId),
      });
    },
  });
}

export function useRemovePurchaseOrderItem() {
  const queryClient = useQueryClient();
  const removeFn = useServerFn(removePurchaseOrderItem);

  return useMutation({
    mutationFn: (data: RemovePurchaseOrderItemInput) => removeFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrders() });
    },
  });
}
