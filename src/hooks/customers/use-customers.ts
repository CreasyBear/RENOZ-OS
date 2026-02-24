/**
 * Customer Hooks
 *
 * TanStack Query hooks for customer data fetching:
 * - Customer list with pagination and filtering
 * - Customer 360 view
 * - Customer search
 * - Customer mutations (create, update, delete)
 *
 * Uses direct server function calls in queryFn (no useServerFn) per
 * tanstack-start-best-practices and working dashboard pattern.
 */
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  getCustomers,
  getCustomerById,
  getCustomerTags,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkDeleteCustomers,
  bulkUpdateCustomers,
  bulkUpdateHealthScores,
  deleteCustomerTag,
} from '@/server/customers';
import type { CustomerListQuery, CreateCustomer, UpdateCustomer } from '@/lib/schemas/customers';

type CustomerListResult = Awaited<ReturnType<typeof getCustomers>>;
type CustomerDetail = Awaited<ReturnType<typeof getCustomerById>>;

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseCustomersOptions extends Partial<CustomerListQuery> {
  enabled?: boolean;
}

export function useCustomers(options: UseCustomersOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: async () => {
      const result = await getCustomers({ data: filters as CustomerListQuery });
      if (result == null) throw new Error('Customers list returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Infinite scroll customers list
 */
export function useCustomersInfinite(filters: Partial<CustomerListQuery> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.customers.list(filters), // Use list key for infinite queries too
    queryFn: async ({ pageParam }) => {
      const result = await getCustomers({
        data: {
          ...filters,
          page: pageParam,
          pageSize: filters.pageSize ?? 50,
        } as CustomerListQuery,
      });
      if (result == null) throw new Error('Customers list returned no data');
      return result;
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
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: async () => {
      const result = await getCustomerById({ data: { id } });
      if (result == null) throw new Error('Customer not found');
      return result;
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
  return useQuery({
    queryKey: queryKeys.customers.tags.list(),
    queryFn: async () => {
      const result = await getCustomerTags();
      if (result == null) throw new Error('Customer tags returned no data');
      return result;
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

export function useCustomerSearch({ query, limit = 10, enabled = true }: UseCustomerSearchOptions) {
  return useQuery({
    queryKey: queryKeys.customers.list({ search: query }),
    queryFn: async () => {
      const result = await getCustomers({
        data: {
          search: query,
          pageSize: limit,
          page: 1,
        } as CustomerListQuery,
      });
      if (result == null) throw new Error('Customer search returned no data');
      return result;
    },
    enabled: enabled && query.length >= 2,
    staleTime: 10 * 1000, // 10 seconds
    placeholderData: (previousData) => previousData,
  });
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
      // Invalidate customer lists
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
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
        const result = await getCustomerById({ data: { id } });
        if (result == null) throw new Error('Customer not found');
        return result;
      },
      staleTime: 60 * 1000,
    });
  };
}

// ============================================================================
// TYPES
// ============================================================================

export type { CustomerListQuery, CreateCustomer, UpdateCustomer };
