/**
 * Customer Address Hooks
 *
 * TanStack Query mutation hooks for customer address management.
 * Handles create, update, and delete operations with proper cache invalidation.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  createAddress,
  updateAddress,
  deleteAddress,
} from '@/server/customers';

// ============================================================================
// TYPES
// ============================================================================

export type AddressType = 'billing' | 'shipping' | 'service' | 'headquarters';

export interface CreateAddressInput {
  customerId: string;
  type: AddressType;
  isPrimary?: boolean;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postcode: string;
  country: string;
}

export interface UpdateAddressInput {
  id: string;
  type?: AddressType;
  isPrimary?: boolean;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateAddress() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createAddress);

  return useMutation({
    mutationFn: (data: CreateAddressInput) => fn({ data }),
    onSuccess: (_result, variables) => {
      // Invalidate customer detail to refresh addresses
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customerId),
      });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  const fn = useServerFn(updateAddress);

  return useMutation({
    mutationFn: (data: UpdateAddressInput) => fn({ data }),
    onSuccess: () => {
      // Invalidate all customer queries since we don't know which customer
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  const fn = useServerFn(deleteAddress);

  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => {
      // Invalidate all customer queries since we don't know which customer
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}
