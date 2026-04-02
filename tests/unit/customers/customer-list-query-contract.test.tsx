import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockGetCustomers = vi.fn()
const mockUseServerFn = vi.fn((fn: unknown) => fn)

vi.mock('@tanstack/react-start', () => ({
  useServerFn: (fn: unknown) => mockUseServerFn(fn),
}))

vi.mock('@/server/functions/customers/customers', () => ({
  getCustomers: (...args: unknown[]) => mockGetCustomers(...args),
  getCustomerById: vi.fn(),
  getCustomerTags: vi.fn(),
  createCustomer: vi.fn(),
  createCustomerBundle: vi.fn(),
  updateCustomer: vi.fn(),
  updateCustomerBundle: vi.fn(),
  deleteCustomer: vi.fn(),
  bulkDeleteCustomers: vi.fn(),
  bulkUpdateCustomers: vi.fn(),
  bulkAssignTags: vi.fn(),
  bulkUpdateHealthScores: vi.fn(),
  deleteCustomerTag: vi.fn(),
}))

vi.mock('@/server/functions/financial/xero-operations', () => ({
  getCustomerXeroMappingStatus: vi.fn(),
  searchCustomerXeroContacts: vi.fn(),
  createCustomerXeroContact: vi.fn(),
  linkCustomerXeroContact: vi.fn(),
  unlinkCustomerXeroContact: vi.fn(),
}))

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'CustomerListQueryContractWrapper'
  return Wrapper
}

describe('customer list query contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomers.mockResolvedValue({
      items: [],
      pagination: { totalItems: 0 },
    })
  })

  it('uses the same normalized filters for the finite query key and server request', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { useCustomers } = await import('@/hooks/customers/use-customers')

    renderHook(
      () =>
        useCustomers({
          search: 'Ada',
          sortBy: 'not-a-real-field' as never,
        }),
      { wrapper: createWrapper(queryClient) }
    )

    await waitFor(() => expect(mockGetCustomers).toHaveBeenCalled())

    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(
      queryKeys.customers.list({
        search: 'Ada',
        sortBy: undefined,
      })
    )

    expect(mockGetCustomers.mock.calls[0]?.[0]).toEqual({
      data: {
        search: 'Ada',
        sortBy: undefined,
      },
    })
  })

  it('uses a dedicated infinite key namespace and normalized request payload', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { useCustomersInfinite } = await import('@/hooks/customers/use-customers')

    renderHook(
      () =>
        useCustomersInfinite({
          search: 'Ada',
          sortBy: 'not-a-real-field' as never,
        }),
      { wrapper: createWrapper(queryClient) }
    )

    await waitFor(() => expect(mockGetCustomers).toHaveBeenCalled())

    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(
      queryKeys.customers.infiniteList({
        search: 'Ada',
        sortBy: undefined,
      })
    )

    expect(mockGetCustomers.mock.calls[0]?.[0]).toEqual({
      data: {
        search: 'Ada',
        sortBy: undefined,
        page: 1,
        pageSize: 50,
      },
    })
  })

  it('includes limit-sensitive search filters in both the key and the request', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { useCustomerSearch } = await import('@/hooks/customers/use-customers')

    renderHook(() => useCustomerSearch({ query: 'Ada', limit: 10 }), {
      wrapper: createWrapper(queryClient),
    })
    renderHook(() => useCustomerSearch({ query: 'Ada', limit: 50 }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(mockGetCustomers).toHaveBeenCalledTimes(2))

    expect(queryClient.getQueryCache().getAll().map((query) => query.queryKey)).toContainEqual(
      queryKeys.customers.list({
        search: 'Ada',
        page: 1,
        pageSize: 10,
      })
    )
    expect(queryClient.getQueryCache().getAll().map((query) => query.queryKey)).toContainEqual(
      queryKeys.customers.list({
        search: 'Ada',
        page: 1,
        pageSize: 50,
      })
    )
    expect(mockGetCustomers.mock.calls[0]?.[0]).toEqual({
      data: {
        search: 'Ada',
        page: 1,
        pageSize: 10,
      },
    })
    expect(mockGetCustomers.mock.calls[1]?.[0]).toEqual({
      data: {
        search: 'Ada',
        page: 1,
        pageSize: 50,
      },
    })
  })
})
