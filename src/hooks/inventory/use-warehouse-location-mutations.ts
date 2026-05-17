/**
 * Warehouse Location Mutation Hooks
 *
 * Owns focused warehouse location create/update/delete mutation contracts and
 * cache invalidation policy.
 */
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  createWarehouseLocation,
  updateWarehouseLocation,
  deleteWarehouseLocation,
} from '@/server/functions/inventory/locations';
import type {
  CreateWarehouseLocationInput,
  UpdateWarehouseLocationInput,
} from '@/lib/schemas/inventory';
import { toast } from '../_shared/use-toast';
import { formatInventoryMutationError } from './_mutation-errors';

export function invalidateWarehouseLocationMutationQueries(
  queryClient: QueryClient,
  locationId?: string
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.locations.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.locations.tree() });
  queryClient.invalidateQueries({ queryKey: queryKeys.locations.hierarchies() });
  queryClient.invalidateQueries({ queryKey: queryKeys.locations.utilization() });

  if (locationId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.locations.detail(locationId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.locations.contents(locationId) });
  }
}

/**
 * Create a warehouse location.
 */
export function useCreateWarehouseLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWarehouseLocationInput) =>
      createWarehouseLocation({ data }),
    onSuccess: (result) => {
      toast.success('Location created');
      invalidateWarehouseLocationMutationQueries(queryClient, result?.location?.id);
    },
    onError: (error: unknown) => {
      toast.error(formatInventoryMutationError(error, 'Failed to create location'));
    },
  });
}

/**
 * Update a warehouse location.
 */
export function useUpdateWarehouseLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWarehouseLocationInput }) =>
      updateWarehouseLocation({ data: { id, data } }),
    onSuccess: (result, variables) => {
      toast.success('Location updated');
      invalidateWarehouseLocationMutationQueries(queryClient, result?.location?.id ?? variables.id);
    },
    onError: (error: unknown) => {
      toast.error(formatInventoryMutationError(error, 'Failed to update location'));
    },
  });
}

/**
 * Delete a warehouse location.
 */
export function useDeleteWarehouseLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationId: string) =>
      deleteWarehouseLocation({ data: { id: locationId } }),
    onSuccess: (_result, locationId) => {
      toast.success('Location deleted');
      invalidateWarehouseLocationMutationQueries(queryClient, locationId);
    },
    onError: (error: unknown) => {
      toast.error(formatInventoryMutationError(error, 'Failed to delete location'));
    },
  });
}
