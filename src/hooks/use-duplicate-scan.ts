/**
 * Duplicate Scan Hooks
 *
 * TanStack Query hooks for batch duplicate scanning and merge history.
 * Wraps server functions for database-wide duplicate detection.
 *
 * @see src/server/functions/customer-duplicate-scan.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import {
  scanForDuplicates,
  dismissDuplicatePair,
  getMergeHistory,
  type DuplicatePair,
} from '@/server/functions/customer-duplicate-scan'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const duplicateScanKeys = {
  all: ['duplicate-scan'] as const,
  scan: (opts: { threshold: number; limit: number }) =>
    [...duplicateScanKeys.all, 'scan', opts] as const,
  history: (opts?: { limit: number; action?: string }) =>
    [...duplicateScanKeys.all, 'history', opts ?? {}] as const,
}

// ============================================================================
// DUPLICATE SCANNING
// ============================================================================

export interface ScanDuplicatesOptions {
  threshold?: number
  limit?: number
  offset?: number
  includeArchived?: boolean
  batchSize?: number
  enabled?: boolean
}

/**
 * Hook for scanning database for duplicate customers.
 * Uses index-accelerated pg_trgm similarity matching.
 */
export function useDuplicateScan(options: ScanDuplicatesOptions = {}) {
  const {
    threshold = 0.4,
    limit = 50,
    offset = 0,
    includeArchived = false,
    batchSize = 500,
    enabled = true,
  } = options

  const scanFn = useServerFn(scanForDuplicates)

  return useQuery({
    queryKey: duplicateScanKeys.scan({ threshold, limit }),
    queryFn: async () => {
      const result = await scanFn({
        data: {
          threshold,
          limit,
          offset,
          includeArchived,
          batchSize,
        },
      })
      return result
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes - duplicates don't change often
    refetchOnWindowFocus: false,
  })
}

// ============================================================================
// DISMISS DUPLICATE
// ============================================================================

/**
 * Mutation hook for dismissing a duplicate pair (marking as "not duplicates")
 */
export function useDismissDuplicate() {
  const queryClient = useQueryClient()
  const dismissFn = useServerFn(dismissDuplicatePair)

  return useMutation({
    mutationFn: async (data: {
      customer1Id: string
      customer2Id: string
      reason?: string
    }) => {
      return dismissFn({ data })
    },
    onSuccess: () => {
      // Invalidate scan results to refetch
      queryClient.invalidateQueries({ queryKey: duplicateScanKeys.all })
    },
  })
}

// ============================================================================
// MERGE HISTORY
// ============================================================================

export interface MergeHistoryOptions {
  limit?: number
  offset?: number
  action?: 'merged' | 'dismissed' | 'undone'
  enabled?: boolean
}

/**
 * Hook for fetching merge audit history
 */
export function useMergeHistory(options: MergeHistoryOptions = {}) {
  const { limit = 50, offset = 0, action, enabled = true } = options

  const historyFn = useServerFn(getMergeHistory)

  return useQuery({
    queryKey: duplicateScanKeys.history({ limit, action }),
    queryFn: async () => {
      const result = await historyFn({
        data: {
          limit,
          offset,
          action,
        },
      })
      return result
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// ============================================================================
// COMBINED HOOK FOR DUPLICATES PAGE
// ============================================================================

export interface DuplicatesPageData {
  pairs: DuplicatePair[]
  hasMore: boolean
  total: number
  history: Awaited<ReturnType<typeof getMergeHistory>>['history']
  isLoading: boolean
  isError: boolean
  refetchScan: () => void
}

/**
 * Combined hook for the duplicates management page.
 * Fetches both scan results and merge history.
 */
export function useDuplicatesPage(options: {
  threshold?: number
  limit?: number
} = {}): DuplicatesPageData {
  const { threshold = 0.4, limit = 50 } = options

  const scan = useDuplicateScan({ threshold, limit, enabled: true })
  const history = useMergeHistory({ limit: 20, enabled: true })

  return {
    pairs: scan.data?.pairs ?? [],
    hasMore: scan.data?.hasMore ?? false,
    total: scan.data?.total ?? 0,
    history: history.data?.history ?? [],
    isLoading: scan.isLoading || history.isLoading,
    isError: scan.isError || history.isError,
    refetchScan: scan.refetch,
  }
}

// Re-export types
export type { DuplicatePair }
