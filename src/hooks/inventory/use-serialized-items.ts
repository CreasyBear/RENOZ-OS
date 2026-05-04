/**
 * Serialized Item Hooks
 *
 * TanStack Query hooks for canonical serialized lineage CRUD and timeline.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  isReadQueryError,
  normalizeReadQueryError,
  requireReadResult,
} from '@/lib/read-path-policy';
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
  UpdateSerializedItemInput,
} from '@/lib/schemas/inventory';
import { formatInventoryMutationError } from './_mutation-errors';

export interface UseSerializedItemsOptions extends Partial<SerializedItemListQuery> {
  enabled?: boolean;
}

const SERIALIZED_MUTATION_ERROR_MESSAGES: Record<string, string> = {
  allocation_conflict: 'This serial conflicts with an existing allocation or identity record.',
  shipped_status_conflict: 'This serial has shipment history and cannot be mutated in this way.',
  invalid_serial_state: 'This serial is in an invalid state for the requested action.',
  transition_blocked: 'This transition is blocked by current workflow state.',
  notification_failed: 'The operation succeeded but downstream notification failed.',
};

function mapSerializedErrorMessage(error: unknown, fallback: string): string {
  return formatInventoryMutationError(error, fallback, {
    codeMessages: SERIALIZED_MUTATION_ERROR_MESSAGES,
  });
}

export function useSerializedItems(options: UseSerializedItemsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.inventory.serializedList(filters),
    queryFn: async () => {
      try {
        const result = await listSerializedItems({
          data: {
            page: filters.page ?? 1,
            pageSize: filters.pageSize ?? 25,
            search: filters.search,
            productId: filters.productId,
            status: filters.status,
          },
        });
        return requireReadResult(result, {
          message: 'Serialized items returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Serialized items are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Serialized items are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useSerializedItem(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.serializedDetail(id),
    queryFn: async () => {
      try {
        const result = await getSerializedItem({ data: { id } });
        return requireReadResult(result, {
          message: 'Serialized item not found',
          contractType: 'detail-not-found',
          fallbackMessage:
            'Serialized item details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested serialized item could not be found.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage:
            'Serialized item details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested serialized item could not be found.',
        });
      }
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
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availableSerialsAll() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availableSerialsAll() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availableSerialsAll() });
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
