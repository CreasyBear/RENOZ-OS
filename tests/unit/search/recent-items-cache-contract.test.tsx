import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockTrackRecentItem = vi.fn()

vi.mock('@/server/functions/search/search', () => ({
  trackRecentItem: (...args: unknown[]) => mockTrackRecentItem(...args),
}))

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'RecentItemsCacheContractWrapper'
  return Wrapper
}

describe('recent items cache contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refreshes recent-item lists without recent-items root invalidation', async () => {
    mockTrackRecentItem.mockResolvedValue({ success: true })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useTrackRecentItem } = await import('@/hooks/search/use-track-recent-item')

    const { result } = renderHook(() => useTrackRecentItem(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        entityType: 'customer',
        entityId: 'customer-1',
        title: 'Acme Battery',
        subtitle: 'Commercial customer',
        url: '/customers/customer-1',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.recentItems.lists(),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.recentItems.all,
    })
  })
})
