/**
 * Customer Contact Hooks
 *
 * TanStack Query mutation hooks for customer contact management.
 * Handles create, update, and delete operations with proper cache invalidation.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  createContact,
  updateContact,
  deleteContact,
} from '@/server/customers';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateContactInput {
  customerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  title?: string;
  department?: string;
  isPrimary?: boolean;
  decisionMaker?: boolean;
  influencer?: boolean;
}

export interface UpdateContactInput {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  title?: string;
  department?: string;
  isPrimary?: boolean;
  decisionMaker?: boolean;
  influencer?: boolean;
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateContact() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createContact);

  return useMutation({
    mutationFn: (data: CreateContactInput) => fn({ data }),
    onSuccess: (_result, variables) => {
      // Invalidate customer detail to refresh contacts
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customerId),
      });
      // Invalidate contacts list if one exists
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.byCustomer(variables.customerId),
      });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const fn = useServerFn(updateContact);

  return useMutation({
    mutationFn: (data: UpdateContactInput) => fn({ data }),
    onSuccess: () => {
      // Invalidate all customer queries since we don't know which customer
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  const fn = useServerFn(deleteContact);

  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => {
      // Invalidate all customer queries since we don't know which customer
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}
