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
} from '@/server/functions/customers/customers';

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

function invalidateCustomerAddressMutationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  customerId?: string | null
) {
  if (customerId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
    return;
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.customers.details() });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createAddress);

  return useMutation({
    mutationFn: (data: CreateAddressInput) => fn({ data }),
    onSuccess: (_result, variables) => {
      invalidateCustomerAddressMutationQueries(queryClient, variables.customerId);
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  const fn = useServerFn(updateAddress);

  return useMutation({
    mutationFn: (data: UpdateAddressInput) => fn({ data }),
    onSuccess: (result) => {
      invalidateCustomerAddressMutationQueries(queryClient, result?.customerId);
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  const fn = useServerFn(deleteAddress);

  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: (result) => {
      invalidateCustomerAddressMutationQueries(queryClient, result?.customerId);
    },
  });
}
