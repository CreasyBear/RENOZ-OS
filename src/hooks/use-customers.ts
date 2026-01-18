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
  getCustomer360,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkDeleteCustomers,
  bulkUpdateCustomers,
} from '@/server/customers'
import type {
  GetCustomersInput,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '@/lib/schemas/customers'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: Partial<GetCustomersInput>) => [...customerKeys.lists(), filters] as const,
  infinite: (filters: Partial<GetCustomersInput>) => [...customerKeys.all, 'infinite', filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  search: (query: string) => [...customerKeys.all, 'search', query] as const,
}

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseCustomersOptions extends Partial<GetCustomersInput> {
  enabled?: boolean
}

export function useCustomers(options: UseCustomersOptions = {}) {
  const { enabled = true, ...filters } = options

  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => getCustomers(filters as GetCustomersInput),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Infinite scroll customers list
 */
export function useCustomersInfinite(filters: Partial<GetCustomersInput> = {}) {
  return useInfiniteQuery({
    queryKey: customerKeys.infinite(filters),
    queryFn: ({ pageParam }) =>
      getCustomers({
        ...filters,
        page: pageParam,
        limit: filters.limit ?? 50,
      } as GetCustomersInput),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.customers.length, 0)
      return totalFetched < lastPage.total ? allPages.length + 1 : undefined
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
    queryFn: () => getCustomer360({ id }),
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
        search: query,
        limit,
        page: 1,
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
    mutationFn: (input: CreateCustomerInput) => createCustomer(input),
    onSuccess: () => {
      // Invalidate customer lists
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCustomerInput & { id: string }) =>
      updateCustomer({ id, ...data }),
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
    mutationFn: (id: string) => deleteCustomer({ id }),
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
    mutationFn: (ids: string[]) => bulkDeleteCustomers({ ids }),
    onSuccess: (_, ids) => {
      // Remove each from cache
      ids.forEach((id) => {
        queryClient.removeQueries({ queryKey: customerKeys.detail(id) })
      })
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}

export function useBulkUpdateCustomers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { ids: string[]; updates: Partial<UpdateCustomerInput> }) =>
      bulkUpdateCustomers(input),
    onSuccess: (_, variables) => {
      // Invalidate each customer and lists
      variables.ids.forEach((id) => {
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
      queryFn: () => getCustomer360({ id }),
      staleTime: 60 * 1000,
    })
  }
}

// ============================================================================
// TYPES
// ============================================================================

export type { GetCustomersInput, CreateCustomerInput, UpdateCustomerInput }
