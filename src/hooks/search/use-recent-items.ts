/**
 * useRecentItems Hook
 *
 * TanStack Query hook for the listRecentItems server function.
 * Returns recently viewed entities for the current user.
 *
 * @example
 * ```tsx
 * const { data } = useRecentItems({ limit: 8, enabled: isPaletteOpen });
 * ```
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

const loadSearchModule = async () => import('@/server/functions/search/search')

interface RecentItemsOptions {
  limit?: number
  enabled?: boolean
}

export function useRecentItems(options: RecentItemsOptions = {}) {
  const { limit = 20, enabled = true } = options

  return useQuery({
    queryKey: queryKeys.recentItems.list(limit),
    queryFn: async () => {
      const { listRecentItems } = await loadSearchModule()
      return listRecentItems({ data: { limit } })
    },
    enabled,
    staleTime: 60_000,
  })
}
