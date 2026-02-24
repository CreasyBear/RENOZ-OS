/**
 * Serialized Item Hooks
 *
 * TanStack Query hooks for canonical serialized lineage CRUD and timeline.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  addSerializedItemNote,
  createSerializedItem,
  deleteSerializedItem,
  getSerializedItem,
  listSerializedItems,
  updateSerializedItem,
} from '@/server/functions/inventory/serialized-items';
import type {
  CreateSerializedItemInput,
  DeleteSerializedItemInput,
  SerializedItemListQuery,
  SerializedMutationErrorCode,
  UpdateSerializedItemInput,
} from '@/lib/schemas/inventory';

export interface UseSerializedItemsOptions extends Partial<SerializedItemListQuery> {
  enabled?: boolean;
}

function getSerializedErrorCode(error: unknown): SerializedMutationErrorCode | null {
  const candidate = (error as { details?: { validationErrors?: { code?: string[] } } })?.details
    ?.validationErrors?.code?.[0];
  if (
    candidate === 'allocation_conflict' ||
    candidate === 'shipped_status_conflict' ||
    candidate === 'invalid_serial_state' ||
    candidate === 'transition_blocked' ||
    candidate === 'notification_failed'
  ) {
    return candidate;
  }
  return null;
}

function mapSerializedErrorMessage(error: unknown, fallback: string): string {
  const code = getSerializedErrorCode(error);
  if (!code) {
    return error instanceof Error ? error.message || fallback : fallback;
  }

  switch (code) {
    case 'allocation_conflict':
      return 'This serial conflicts with an existing allocation or identity record.';
    case 'shipped_status_conflict':
      return 'This serial has shipment history and cannot be mutated in this way.';
    case 'invalid_serial_state':
      return 'This serial is in an invalid state for the requested action.';
    case 'transition_blocked':
      return 'This transition is blocked by current workflow state.';
    case 'notification_failed':
      return 'The operation succeeded but downstream notification failed.';
    default:
      return fallback;
  }
}

export function useSerializedItems(options: UseSerializedItemsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.inventory.serializedList(filters),
    queryFn: async () => {
      const result = await listSerializedItems({
        data: {
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 25,
          search: filters.search,
          productId: filters.productId,
          status: filters.status,
        },
      });
      if (result == null) throw new Error('Serialized items returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useSerializedItem(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.serializedDetail(id),
    queryFn: async () => {
      const result = await getSerializedItem({ data: { id } });
      if (result == null) throw new Error('Serialized item not found');
      return result;
    },
    enabled: enabled && !!id,
    staleTime: 20 * 1000,
  });
}

export function useCreateSerializedItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSerializedItemInput) => createSerializedItem({ data }),
    onSuccess: (result) => {
      toast.success(result.message ?? 'Serialized item created');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.serializedAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.inventory.all, 'availableSerials'] });
    },
    onError: (error: unknown) => {
      toast.error(mapSerializedErrorMessage(error, 'Failed to create serialized item'));
    },
  });
}

export function useUpdateSerializedItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSerializedItemInput) => updateSerializedItem({ data }),
    onSuccess: (result, variables) => {
      toast.success(result.message ?? 'Serialized item updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.serializedAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.serializedDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.inventory.all, 'availableSerials'] });
    },
    onError: (error: unknown) => {
      toast.error(mapSerializedErrorMessage(error, 'Failed to update serialized item'));
    },
  });
}

export function useDeleteSerializedItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeleteSerializedItemInput) => deleteSerializedItem({ data }),
    onSuccess: (result) => {
      toast.success(result.message ?? 'Serialized item deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.serializedAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.inventory.all, 'availableSerials'] });
    },
    onError: (error: unknown) => {
      toast.error(mapSerializedErrorMessage(error, 'Failed to delete serialized item'));
    },
  });
}

export function useAddSerializedItemNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; note: string }) => addSerializedItemNote({ data }),
    onSuccess: (result, variables) => {
      toast.success(result.message ?? 'Note added');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.serializedDetail(variables.id) });
    },
    onError: (error: unknown) => {
      toast.error(mapSerializedErrorMessage(error, 'Failed to add note'));
    },
  });
}
