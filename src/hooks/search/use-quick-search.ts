/**
 * useQuickSearch Hook
 *
 * TanStack Query hook for the quickSearch server function.
 * Searches the search_index table with full-text search + ILIKE fallback.
 *
 * @example
 * ```tsx
 * const debouncedSearch = useDebounce(search, 300);
 * const { data, isLoading } = useQuickSearch(debouncedSearch);
 * ```
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { searchEntityTypeValues } from '@/lib/schemas/search/search'

const loadSearchModule = async () => import('@/server/functions/search/search')

type SearchEntityType = (typeof searchEntityTypeValues)[number]

interface QuickSearchOptions {
  entityTypes?: SearchEntityType[]
  limit?: number
  enabled?: boolean
}

export function useQuickSearch(query: string, options: QuickSearchOptions = {}) {
  const { entityTypes, limit = 5, enabled = true } = options

  return useQuery({
    queryKey: queryKeys.search.quick(query, { entityTypes, limit }),
    queryFn: async () => {
      const { quickSearch } = await loadSearchModule()
      return quickSearch({ data: { query, entityTypes, limit } })
    },
    enabled: enabled && query.length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}
