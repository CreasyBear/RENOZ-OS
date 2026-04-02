import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockListOrders = vi.fn()
const mockUseServerFn = vi.fn((fn: unknown) => fn)

vi.mock('@tanstack/react-start', () => ({
  useServerFn: (fn: unknown) => mockUseServerFn(fn),
}))

vi.mock('@/server/functions/orders/orders', () => ({
  listOrders: (...args: unknown[]) => mockListOrders(...args),
  getOrder: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  duplicateOrder: vi.fn(),
  getOrderStats: vi.fn(),
  getFulfillmentDashboardSummary: vi.fn(),
  addOrderLineItem: vi.fn(),
  updateOrderLineItem: vi.fn(),
  deleteOrderLineItem: vi.fn(),
}))

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'OrderListQueryContractWrapper'
  return Wrapper
}

describe('order list query contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListOrders.mockResolvedValue({
      orders: [],
      total: 0,
      page: 1,
      pageSize: 50,
      hasMore: false,
    })
  })

  it('uses the same normalized filters for the finite query key and server request', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { useOrders } = await import('@/hooks/orders/use-orders')

    renderHook(
      () =>
        useOrders({
          search: 'SO-100',
          sortBy: 'not-a-real-field' as never,
        }),
      { wrapper: createWrapper(queryClient) }
    )

    await waitFor(() => expect(mockListOrders).toHaveBeenCalled())

    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(
      queryKeys.orders.list({
        search: 'SO-100',
        sortBy: undefined,
      })
    )

    expect(mockListOrders.mock.calls[0]?.[0]).toEqual({
      data: {
        search: 'SO-100',
        sortBy: undefined,
      },
    })
  })

  it('uses a dedicated infinite key namespace and normalized request payload', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { useOrdersInfinite } = await import('@/hooks/orders/use-orders')

    renderHook(
      () =>
        useOrdersInfinite({
          search: 'SO-100',
          sortBy: 'not-a-real-field' as never,
        }),
      { wrapper: createWrapper(queryClient) }
    )

    await waitFor(() => expect(mockListOrders).toHaveBeenCalled())

    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(
      queryKeys.orders.infiniteList({
        search: 'SO-100',
        sortBy: undefined,
      })
    )

    expect(mockListOrders.mock.calls[0]?.[0]).toEqual({
      data: {
        search: 'SO-100',
        sortBy: undefined,
        page: 1,
        pageSize: 50,
      },
    })
  })
})
