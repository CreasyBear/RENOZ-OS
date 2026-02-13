/**
 * useTrackRecentItem / useTrackView Hooks
 *
 * Mutations for tracking recently viewed entities.
 * useTrackView is a convenience wrapper that fires once on mount.
 *
 * @example
 * ```tsx
 * // In a detail container:
 * useTrackView('customer', customer.id, customer.name, customer.email, `/customers/${customer.id}`);
 * ```
 */
import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

const loadSearchModule = async () => import('@/server/functions/search/search')

interface TrackRecentItemInput {
  entityType: string
  entityId: string
  title: string
  subtitle?: string
  url?: string
}

export function useTrackRecentItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TrackRecentItemInput) => {
      const { trackRecentItem } = await loadSearchModule()
      return trackRecentItem({ data })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recentItems.all })
    },
  })
}

/**
 * Convenience hook that tracks a view once on mount.
 * Fire-and-forget - does not affect UI on failure.
 */
export function useTrackView(
  entityType: string | undefined,
  entityId: string | undefined,
  title: string | undefined,
  subtitle?: string,
  url?: string
) {
  const trackMutation = useTrackRecentItem()
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current || !entityType || !entityId || !title) return
    tracked.current = true

    trackMutation.mutate(
      { entityType, entityId, title, subtitle, url },
      { onError: () => {} } // Silently ignore errors
    )
  }, [entityType, entityId, title, subtitle, url, trackMutation])
}
