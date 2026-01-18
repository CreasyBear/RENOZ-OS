/**
 * Customer Hooks
 *
 * TanStack Query hooks for customer data fetching:
 * - Customer list with pagination and filtering
 * - Customer 360 view
 * - Customer search
 * - Customer mutations (create, update, delete)
 */
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkDeleteCustomers,
  bulkUpdateCustomers,
} from '@/server/customers'
import type {
  CustomerListQuery,
  CreateCustomer,
  UpdateCustomer,
} from '@/lib/schemas/customers'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: Partial<CustomerListQuery>) => [...customerKeys.lists(), filters] as const,
  infinite: (filters: Partial<CustomerListQuery>) => [...customerKeys.all, 'infinite', filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  search: (query: string) => [...customerKeys.all, 'search', query] as const,
}

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseCustomersOptions extends Partial<CustomerListQuery> {
  enabled?: boolean
}

export function useCustomers(options: UseCustomersOptions = {}) {
  const { enabled = true, ...filters } = options

  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => getCustomers({ data: filters as CustomerListQuery }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Infinite scroll customers list
 */
export function useCustomersInfinite(filters: Partial<CustomerListQuery> = {}) {
  return useInfiniteQuery({
    queryKey: customerKeys.infinite(filters),
    queryFn: ({ pageParam }) =>
      getCustomers({
        data: {
          ...filters,
          page: pageParam,
          pageSize: filters.pageSize ?? 50,
        } as CustomerListQuery,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return totalFetched < lastPage.pagination.totalItems ? allPages.length + 1 : undefined
    },
    staleTime: 30 * 1000,
  })
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export interface UseCustomerOptions {
  id: string
  enabled?: boolean
}

export function useCustomer({ id, enabled = true }: UseCustomerOptions) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => getCustomerById({ data: { id } }),
    enabled: enabled && !!id,
    staleTime: 60 * 1000, // 1 minute
  })
}

// ============================================================================
// SEARCH HOOK
// ============================================================================

export interface UseCustomerSearchOptions {
  query: string
  limit?: number
  enabled?: boolean
}

export function useCustomerSearch({ query, limit = 10, enabled = true }: UseCustomerSearchOptions) {
  return useQuery({
    queryKey: customerKeys.search(query),
    queryFn: () =>
      getCustomers({
        data: {
          search: query,
          pageSize: limit,
          page: 1,
        } as CustomerListQuery,
      }),
    enabled: enabled && query.length >= 2,
    staleTime: 10 * 1000, // 10 seconds
    placeholderData: (previousData) => previousData,
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCustomer) => createCustomer({ data: input }),
    onSuccess: () => {
      // Invalidate customer lists
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCustomer & { id: string }) =>
      updateCustomer({ data: { id, ...data } }),
    onSuccess: (_, variables) => {
      // Invalidate specific customer and lists
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCustomer({ data: { id } }),
    onSuccess: (_, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: customerKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}

export function useBulkDeleteCustomers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (customerIds: string[]) => bulkDeleteCustomers({ data: { customerIds } }),
    onSuccess: (_, customerIds) => {
      // Remove each from cache
      customerIds.forEach((id) => {
        queryClient.removeQueries({ queryKey: customerKeys.detail(id) })
      })
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}

export function useBulkUpdateCustomers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { customerIds: string[]; updates: Partial<UpdateCustomer> }) =>
      bulkUpdateCustomers({ data: input }),
    onSuccess: (_, variables) => {
      // Invalidate each customer and lists
      variables.customerIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) })
      })
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

export function usePrefetchCustomer() {
  const queryClient = useQueryClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: customerKeys.detail(id),
      queryFn: () => getCustomerById({ data: { id } }),
      staleTime: 60 * 1000,
    })
  }
}

// ============================================================================
// TYPES
// ============================================================================

export type { CustomerListQuery, CreateCustomer, UpdateCustomer }
