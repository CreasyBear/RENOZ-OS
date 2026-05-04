/**
 * Customer Hooks
 *
 * TanStack Query hooks for customer data fetching:
 * - Customer list with pagination and filtering
 * - Customer 360 view
 * - Customer search
 * - Customer mutations (create, update, delete)
 *
 * Follows the same hook/server-function contract as orders:
 * - import server functions from the concrete module
 * - wrap them with useServerFn inside hooks
 * - return the mutation/query result directly to callers
 */
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys, type CustomerFilters } from '@/lib/query-keys';
import {
  isReadQueryError,
  normalizeReadQueryError,
  requireReadResult,
} from '@/lib/read-path-policy';
import { normalizeCustomerDetail } from '@/lib/schemas/customers/normalize';
import { isValidCustomerSortField } from '@/components/domain/customers/customer-sorting';
import {
  getCustomers,
  getCustomerById,
  getCustomerTags,
  createCustomer,
  createCustomerBundle,
  updateCustomer,
  updateCustomerBundle,
  deleteCustomer,
  bulkDeleteCustomers,
  bulkUpdateCustomers,
  bulkAssignTags,
  bulkUpdateHealthScores,
  deleteCustomerTag,
} from '@/server/functions/customers/customers';
import {
  getCustomerXeroMappingStatus,
  searchCustomerXeroContacts,
  createCustomerXeroContact,
  linkCustomerXeroContact,
  unlinkCustomerXeroContact,
} from '@/server/functions/financial/xero-operations';
import type {
  CustomerListQuery,
  CreateCustomer,
  CreateCustomerBundle,
  UpdateCustomer,
  UpdateCustomerBundle,
} from '@/lib/schemas/customers';

type CustomerListResult = Awaited<ReturnType<typeof getCustomers>>;
type CustomerDetail = Awaited<ReturnType<typeof getCustomerById>>;

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseCustomersOptions extends Partial<CustomerListQuery> {
  enabled?: boolean;
}

function normalizeCustomerListFilters(filters: Partial<CustomerListQuery>): CustomerFilters {
  return {
    ...filters,
    sortBy:
      typeof filters.sortBy === 'string' && isValidCustomerSortField(filters.sortBy)
        ? filters.sortBy
        : undefined,
  };
}

function invalidateCustomerListQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customers.infiniteLists() });
}

export function useCustomers(options: UseCustomersOptions = {}) {
  const { enabled = true, ...filters } = options;
  const listCustomersFn = useServerFn(getCustomers);
  const normalizedFilters = normalizeCustomerListFilters(filters);

  return useQuery({
    queryKey: queryKeys.customers.list(normalizedFilters),
    queryFn: async () => {
      try {
        const result = await listCustomersFn({ data: normalizedFilters as CustomerListQuery });
        return requireReadResult(result, {
          message: 'Customers list returned no data',
          contractType: 'always-shaped',
          fallbackMessage: 'Customers are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Customers are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Infinite scroll customers list
 */
export function useCustomersInfinite(filters: Partial<CustomerListQuery> = {}) {
  const listCustomersFn = useServerFn(getCustomers);
  const normalizedFilters = normalizeCustomerListFilters(filters);

  return useInfiniteQuery({
    queryKey: queryKeys.customers.infiniteList(normalizedFilters),
    queryFn: async ({ pageParam }) => {
      try {
        const result = await listCustomersFn({
          data: {
            ...normalizedFilters,
            page: pageParam,
            pageSize: normalizedFilters.pageSize ?? 50,
          } as CustomerListQuery,
        });
        return requireReadResult(result, {
          message: 'Customers list returned no data',
          contractType: 'always-shaped',
          fallbackMessage: 'Customers are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Customers are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return totalFetched < lastPage.pagination.totalItems ? allPages.length + 1 : undefined;
    },
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export interface UseCustomerOptions {
  id: string;
  enabled?: boolean;
}

export function useCustomer({ id, enabled = true }: UseCustomerOptions) {
  const getCustomerFn = useServerFn(getCustomerById);

  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: async () => {
      try {
        const result = await getCustomerFn({ data: { id } });
        return normalizeCustomerDetail(
          requireReadResult(result, {
            message: 'Customer not found',
            contractType: 'detail-not-found',
            fallbackMessage:
              'Customer details are temporarily unavailable. Please refresh and try again.',
            notFoundMessage: 'The requested customer could not be found.',
          })
        ) as CustomerDetail;
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Customer details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested customer could not be found.',
        });
      }
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// TAGS HOOK
// ============================================================================

export interface UseCustomerTagsOptions {
  enabled?: boolean;
}

/**
 * Get all customer tags for the organization
 */
export function useCustomerTags({ enabled = true }: UseCustomerTagsOptions = {}) {
  const getCustomerTagsFn = useServerFn(getCustomerTags);

  return useQuery({
    queryKey: queryKeys.customers.tags.list(),
    queryFn: async () => {
      try {
        const result = await getCustomerTagsFn();
        return requireReadResult(result, {
          message: 'Customer tags returned no data',
          contractType: 'always-shaped',
          fallbackMessage: 'Customer tags are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Customer tags are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - tags don't change often
  });
}

// ============================================================================
// SEARCH HOOK
// ============================================================================

export interface UseCustomerSearchOptions {
  query: string;
  limit?: number;
  enabled?: boolean;
}

function normalizeCustomerSearchFilters(query: string, limit: number): CustomerFilters {
  return {
    search: query,
    page: 1,
    pageSize: limit,
  };
}

export function useCustomerSearch({ query, limit = 10, enabled = true }: UseCustomerSearchOptions) {
  const listCustomersFn = useServerFn(getCustomers);
  const normalizedFilters = normalizeCustomerSearchFilters(query, limit);

  return useQuery({
    queryKey: queryKeys.customers.list(normalizedFilters),
    queryFn: async () => {
      try {
        const result = await listCustomersFn({
          data: normalizedFilters as CustomerListQuery,
        });
        return requireReadResult(result, {
          message: 'Customer search returned no data',
          contractType: 'always-shaped',
          fallbackMessage: 'Customer search is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Customer search is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && query.length >= 2,
    staleTime: 10 * 1000, // 10 seconds
    placeholderData: (previousData) => previousData,
  });
}

export function useCustomerLookup() {
  const listCustomersFn = useServerFn(getCustomers);

  return async (params: Partial<CustomerListQuery>) => {
    try {
      const result = await listCustomersFn({
        data: {
          page: 1,
          pageSize: 20,
          sortOrder: 'desc',
          ...params,
        } as CustomerListQuery,
      });
      return requireReadResult(result, {
        message: 'Customer lookup returned no data',
        contractType: 'always-shaped',
        fallbackMessage: 'Customer lookup is temporarily unavailable. Please refresh and try again.',
      });
    } catch (error) {
      if (isReadQueryError(error)) throw error;
      throw normalizeReadQueryError(error, {
        contractType: 'always-shaped',
        fallbackMessage: 'Customer lookup is temporarily unavailable. Please refresh and try again.',
      });
    }
  };
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createCustomer);

  return useMutation({
    mutationFn: (input: CreateCustomer) => createFn({ data: input }),
    onSuccess: () => {
      invalidateCustomerListQueries(queryClient);
    },
  });
}

export function useCreateCustomerBundle() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createCustomerBundle);

  return useMutation({
    mutationFn: (input: CreateCustomerBundle) => createFn({ data: input }),
    onSuccess: () => {
      invalidateCustomerListQueries(queryClient);
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateCustomer);

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCustomer & { id: string }) =>
      updateFn({ data: { id, ...data } }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.detail(variables.id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.infiniteLists() });

      const previousDetail = queryClient.getQueryData<CustomerDetail>(
        queryKeys.customers.detail(variables.id)
      );
      const previousLists = queryClient.getQueriesData<CustomerListResult>({
        queryKey: queryKeys.customers.lists(),
      });

      if (previousDetail) {
        queryClient.setQueryData<CustomerDetail>(queryKeys.customers.detail(variables.id), {
          ...previousDetail,
          ...variables,
          updatedAt: new Date(),
        });
      }

      queryClient.setQueriesData<CustomerListResult>(
        { queryKey: queryKeys.customers.lists() },
        (old) => {
          if (!old) return old;
          const items = old.items.map((customer) =>
            customer.id === variables.id
              ? {
                  ...customer,
                  ...variables,
                  updatedAt: new Date(),
                }
              : customer
          );
          return { ...old, items };
        }
      );

      return { previousDetail, previousLists };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      if (context.previousDetail) {
        queryClient.setQueryData(
          queryKeys.customers.detail(context.previousDetail.id),
          context.previousDetail
        );
      }
      context.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate specific customer and lists
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
      invalidateCustomerListQueries(queryClient);
    },
  });
}

export function useUpdateCustomerBundle() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateCustomerBundle);

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCustomerBundle & { id: string }) =>
      updateFn({ data: { id, ...data } }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
      invalidateCustomerListQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useCustomerXeroMapping(customerId: string, enabled = true) {
  const fn = useServerFn(getCustomerXeroMappingStatus);

  return useQuery({
    queryKey: queryKeys.financial.xeroCustomerMapping(customerId),
    queryFn: async () => {
      try {
        const result = await fn({ data: { customerId } });
        return requireReadResult(result, {
          message: 'Customer Xero mapping returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Customer accounting mapping is temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Customer accounting mapping is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!customerId,
    staleTime: 30 * 1000,
  });
}

export function useSearchCustomerXeroContacts(customerId: string, query: string, enabled = true) {
  const fn = useServerFn(searchCustomerXeroContacts);

  return useQuery({
    queryKey: queryKeys.financial.xeroContactSearch(customerId, query),
    queryFn: async () => {
      try {
        const result = await fn({ data: { customerId, query } });
        return requireReadResult(result, {
          message: 'Customer lookup returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Customer accounting contacts are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Customer accounting contacts are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!customerId && query.trim().length >= 2,
    staleTime: 15 * 1000,
  });
}

function invalidateXeroCustomerState(queryClient: ReturnType<typeof useQueryClient>, customerId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.financial.xeroCustomerMapping(customerId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.financial.xeroContactSearch(customerId, '') });
  queryClient.invalidateQueries({ queryKey: queryKeys.financial.xero() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
  invalidateCustomerListQueries(queryClient);
}

export function useCreateCustomerXeroContact() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createCustomerXeroContact);

  return useMutation({
    mutationFn: (customerId: string) => fn({ data: { customerId } }),
    onSuccess: (_, customerId) => {
      invalidateXeroCustomerState(queryClient, customerId);
    },
  });
}

export function useLinkCustomerXeroContact() {
  const queryClient = useQueryClient();
  const fn = useServerFn(linkCustomerXeroContact);

  return useMutation({
    mutationFn: ({ customerId, xeroContactId }: { customerId: string; xeroContactId: string }) =>
      fn({ data: { customerId, xeroContactId } }),
    onSuccess: (_, variables) => {
      invalidateXeroCustomerState(queryClient, variables.customerId);
    },
  });
}

export function useUnlinkCustomerXeroContact() {
  const queryClient = useQueryClient();
  const fn = useServerFn(unlinkCustomerXeroContact);

  return useMutation({
    mutationFn: (customerId: string) => fn({ data: { customerId } }),
    onSuccess: (_, customerId) => {
      invalidateXeroCustomerState(queryClient, customerId);
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteCustomer);

  return useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: queryKeys.customers.detail(id) });
      invalidateCustomerListQueries(queryClient);
    },
  });
}

export function useBulkDeleteCustomers() {
  const queryClient = useQueryClient();
  const bulkDeleteFn = useServerFn(bulkDeleteCustomers);

  return useMutation({
    mutationFn: (customerIds: string[]) => bulkDeleteFn({ data: { customerIds } }),
    onSuccess: (_, customerIds) => {
      // Remove each from cache
      customerIds.forEach((id) => {
        queryClient.removeQueries({ queryKey: queryKeys.customers.detail(id) });
      });
      invalidateCustomerListQueries(queryClient);
    },
  });
}

export function useBulkUpdateCustomers() {
  const queryClient = useQueryClient();
  const bulkUpdateFn = useServerFn(bulkUpdateCustomers);

  return useMutation({
    mutationFn: (input: { customerIds: string[]; updates: Partial<UpdateCustomer> }) =>
      bulkUpdateFn({ data: input }),
    onMutate: async (variables) => {
      // Optimistically update each affected customer in cache
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.infiniteLists() });
      const previousLists = queryClient.getQueriesData<CustomerListResult>({
        queryKey: queryKeys.customers.lists(),
      });
      queryClient.setQueriesData<CustomerListResult>(
        { queryKey: queryKeys.customers.lists() },
        (old) => {
          if (!old) return old;
          const items = old.items.map((cust) =>
            variables.customerIds.includes(cust.id)
              ? { ...cust, ...variables.updates, updatedAt: new Date() }
              : cust
          );
          return { ...old, items };
        }
      );
      return { previousLists };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      context.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate each customer and lists
      variables.customerIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(id) });
      });
      invalidateCustomerListQueries(queryClient);
    },
  });
}

export function useBulkAssignCustomerTags() {
  const queryClient = useQueryClient();
  const bulkAssignFn = useServerFn(bulkAssignTags);

  return useMutation({
    mutationFn: (input: { customerIds: string[]; tagIds: string[] }) =>
      bulkAssignFn({ data: input }),
    onSuccess: () => {
      invalidateCustomerListQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.details() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.tags.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.segments.lists() });
    },
  });
}

export function useBulkUpdateHealthScores() {
  const queryClient = useQueryClient();
  const bulkUpdateHealthScoresFn = useServerFn(bulkUpdateHealthScores);

  return useMutation({
    mutationFn: (input: { customerIds: string[]; healthScore: number; reason?: string }) =>
      bulkUpdateHealthScoresFn({ data: input }),
    onSuccess: (result) => {
      // Invalidate customer lists and details
      invalidateCustomerListQueries(queryClient);
      result.results?.forEach((r) => {
        if (r.success) {
          queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(r.customerId) });
        }
      });
    },
  });
}

/**
 * Delete a customer tag.
 */
export function useDeleteCustomerTag() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteCustomerTag);

  return useMutation({
    mutationFn: (tagId: string) => deleteFn({ data: { id: tagId } }),
    onSuccess: () => {
      // Invalidate both list and detail caches per STANDARDS.md
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.tags.list() });
    },
  });
}

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

export function usePrefetchCustomer() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.customers.detail(id),
      queryFn: async () => {
        try {
          const result = await getCustomerById({ data: { id } });
          return normalizeCustomerDetail(
            requireReadResult(result, {
              message: 'Customer not found',
              contractType: 'detail-not-found',
              fallbackMessage:
                'Customer details are temporarily unavailable. Please refresh and try again.',
              notFoundMessage: 'The requested customer could not be found.',
            })
          ) as CustomerDetail;
        } catch (error) {
          if (isReadQueryError(error)) throw error;
          throw normalizeReadQueryError(error, {
            contractType: 'detail-not-found',
            fallbackMessage:
              'Customer details are temporarily unavailable. Please refresh and try again.',
            notFoundMessage: 'The requested customer could not be found.',
          });
        }
      },
      staleTime: 60 * 1000,
    });
  };
}

// ============================================================================
// TYPES
// ============================================================================

export type { CustomerListQuery, CreateCustomer, UpdateCustomer };
