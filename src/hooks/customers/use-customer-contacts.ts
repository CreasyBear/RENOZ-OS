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
} from '@/server/functions/customers/customers';

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

function invalidateCustomerContactMutationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  customerId?: string | null,
  contactId?: string | null
) {
  if (customerId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.contacts.byCustomer(customerId) });
  } else {
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.details() });
    queryClient.invalidateQueries({ queryKey: queryKeys.contacts.lists() });
  }

  if (contactId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(contactId) });
  }
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createContact);

  return useMutation({
    mutationFn: (data: CreateContactInput) => fn({ data }),
    onSuccess: (_result, variables) => {
      invalidateCustomerContactMutationQueries(queryClient, variables.customerId);
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const fn = useServerFn(updateContact);

  return useMutation({
    mutationFn: (data: UpdateContactInput) => fn({ data }),
    onSuccess: (result, variables) => {
      invalidateCustomerContactMutationQueries(
        queryClient,
        result?.customerId,
        result?.id ?? variables.id
      );
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  const fn = useServerFn(deleteContact);

  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: (result, id) => {
      invalidateCustomerContactMutationQueries(queryClient, result?.customerId, result?.id ?? id);
    },
  });
}
