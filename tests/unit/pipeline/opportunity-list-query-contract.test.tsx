import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockListOpportunities = vi.fn()

vi.mock('@/server/functions/pipeline/pipeline', () => ({
  listOpportunities: (...args: unknown[]) => mockListOpportunities(...args),
  getOpportunity: vi.fn(),
}))

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'OpportunityListQueryContractWrapper'
  return Wrapper
}

describe('opportunity list query contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListOpportunities.mockResolvedValue({
      items: [],
      pagination: { totalItems: 0 },
    })
  })

  it('keeps the finite query key aligned with the normalized request payload', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { useOpportunities } = await import('@/hooks/pipeline/use-opportunities')

    renderHook(
      () =>
        useOpportunities({
          search: 'Kitchen',
          sortBy: 'not-a-real-field' as never,
        }),
      { wrapper: createWrapper(queryClient) }
    )

    await waitFor(() => expect(mockListOpportunities).toHaveBeenCalled())

    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(
      queryKeys.opportunities.list({
        search: 'Kitchen',
        page: 1,
        pageSize: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    )

    expect(mockListOpportunities.mock.calls[0]?.[0]).toEqual({
      data: {
        search: 'Kitchen',
        page: 1,
        pageSize: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        stage: undefined,
        assignedTo: undefined,
        customerId: undefined,
      },
    })
  })

  it('uses a dedicated infinite key namespace for infinite opportunity lists', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { useOpportunitiesInfinite } = await import('@/hooks/pipeline/use-opportunities')

    renderHook(
      () =>
        useOpportunitiesInfinite({
          search: 'Kitchen',
          sortBy: 'not-a-real-field' as never,
        }),
      { wrapper: createWrapper(queryClient) }
    )

    await waitFor(() => expect(mockListOpportunities).toHaveBeenCalled())

    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(
      queryKeys.opportunities.infiniteList({
        search: 'Kitchen',
        pageSize: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    )

    expect(mockListOpportunities.mock.calls[0]?.[0]).toEqual({
      data: {
        search: 'Kitchen',
        page: 1,
        pageSize: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        stage: undefined,
        assignedTo: undefined,
        customerId: undefined,
      },
    })
  })

  it('includes limit-sensitive search defaults in both the key and the request', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { useOpportunitySearch } = await import('@/hooks/pipeline/use-opportunities')

    renderHook(() => useOpportunitySearch({ query: 'Kitchen', limit: 10 }), {
      wrapper: createWrapper(queryClient),
    })
    renderHook(() => useOpportunitySearch({ query: 'Kitchen', limit: 25 }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(mockListOpportunities).toHaveBeenCalledTimes(2))

    expect(queryClient.getQueryCache().getAll().map((query) => query.queryKey)).toContainEqual(
      queryKeys.opportunities.list({
        search: 'Kitchen',
        page: 1,
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    )
    expect(queryClient.getQueryCache().getAll().map((query) => query.queryKey)).toContainEqual(
      queryKeys.opportunities.list({
        search: 'Kitchen',
        page: 1,
        pageSize: 25,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    )
    expect(mockListOpportunities.mock.calls[0]?.[0]).toEqual({
      data: {
        search: 'Kitchen',
        page: 1,
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    })
    expect(mockListOpportunities.mock.calls[1]?.[0]).toEqual({
      data: {
        search: 'Kitchen',
        page: 1,
        pageSize: 25,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    })
  })
})
