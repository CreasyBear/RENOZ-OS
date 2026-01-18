/**
 * Duplicate Detection Hook
 *
 * React hook for real-time duplicate customer detection.
 * Debounces API calls and provides loading/error states.
 *
 * @example
 * const { duplicates, isChecking, checkForDuplicates } = useDuplicateDetection()
 *
 * // In form onChange handlers:
 * checkForDuplicates({ name, email, phone })
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useServerFn } from '@tanstack/react-start'
import {
  detectDuplicates,
  type DuplicateMatch,
} from '@/server/functions/customer-duplicates'

// ============================================================================
// TYPES
// ============================================================================

export interface DuplicateDetectionInput {
  name?: string
  email?: string
  phone?: string
}

export interface DuplicateDetectionOptions {
  /** Similarity threshold (0-1). Default: 0.3 */
  threshold?: number
  /** Debounce delay in ms. Default: 300 */
  debounceMs?: number
  /** Maximum results to return. Default: 5 */
  limit?: number
  /** Customer ID to exclude (for edit mode) */
  excludeCustomerId?: string
  /** Auto-check on mount with initial values */
  initialValues?: DuplicateDetectionInput
}

export interface DuplicateDetectionResult {
  /** List of potential duplicate matches */
  duplicates: DuplicateMatch[]
  /** Whether a check is currently in progress */
  isChecking: boolean
  /** Error message if check failed */
  error: string | null
  /** Whether there are more matches beyond the limit */
  hasMore: boolean
  /** Trigger a duplicate check with new values */
  checkForDuplicates: (input: DuplicateDetectionInput) => void
  /** Clear current duplicates */
  clearDuplicates: () => void
  /** Dismiss a specific duplicate (mark as "not a duplicate") */
  dismissDuplicate: (customerId: string) => void
  /** List of dismissed customer IDs */
  dismissedIds: string[]
}

// ============================================================================
// HOOK
// ============================================================================

export function useDuplicateDetection(
  options: DuplicateDetectionOptions = {}
): DuplicateDetectionResult {
  const {
    threshold = 0.3,
    debounceMs = 300,
    limit = 5,
    excludeCustomerId,
    initialValues,
  } = options

  // State
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  // Refs for debouncing
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastInputRef = useRef<DuplicateDetectionInput | null>(null)

  // Server function
  const detectDuplicatesFn = useServerFn(detectDuplicates)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Run initial check if values provided
  useEffect(() => {
    if (initialValues && (initialValues.name || initialValues.email || initialValues.phone)) {
      checkForDuplicates(initialValues)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Check for duplicates with debouncing
   */
  const checkForDuplicates = useCallback(
    (input: DuplicateDetectionInput) => {
      // Store the input for comparison
      lastInputRef.current = input

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Skip if no meaningful input
      const hasName = input.name && input.name.length >= 2
      const hasEmail = input.email && input.email.includes('@')
      const hasPhone = input.phone && input.phone.length >= 6

      if (!hasName && !hasEmail && !hasPhone) {
        setDuplicates([])
        setHasMore(false)
        setError(null)
        return
      }

      // Debounce the API call
      timeoutRef.current = setTimeout(async () => {
        // Check if input has changed since we scheduled this
        if (lastInputRef.current !== input) {
          return
        }

        setIsChecking(true)
        setError(null)

        try {
          const result = await detectDuplicatesFn({
            data: {
              name: hasName ? input.name : undefined,
              email: hasEmail ? input.email : undefined,
              phone: hasPhone ? input.phone : undefined,
              threshold,
              excludeCustomerId,
              limit,
            },
          })

          // Filter out dismissed duplicates
          const filteredDuplicates = result.duplicates.filter(
            (d) => !dismissedIds.includes(d.customerId)
          )

          setDuplicates(filteredDuplicates)
          setHasMore(result.hasMore)
        } catch (err) {
          console.error('Duplicate detection error:', err)
          setError(err instanceof Error ? err.message : 'Failed to check for duplicates')
          setDuplicates([])
          setHasMore(false)
        } finally {
          setIsChecking(false)
        }
      }, debounceMs)
    },
    [detectDuplicatesFn, threshold, excludeCustomerId, limit, debounceMs, dismissedIds]
  )

  /**
   * Clear all duplicates
   */
  const clearDuplicates = useCallback(() => {
    setDuplicates([])
    setHasMore(false)
    setError(null)
  }, [])

  /**
   * Dismiss a specific duplicate (user confirmed it's not a duplicate)
   */
  const dismissDuplicate = useCallback((customerId: string) => {
    setDismissedIds((prev) => [...prev, customerId])
    setDuplicates((prev) => prev.filter((d) => d.customerId !== customerId))
  }, [])

  return {
    duplicates,
    isChecking,
    error,
    hasMore,
    checkForDuplicates,
    clearDuplicates,
    dismissDuplicate,
    dismissedIds,
  }
}

// ============================================================================
// QUERY KEYS (for TanStack Query integration)
// ============================================================================

export const duplicateDetectionKeys = {
  all: ['duplicate-detection'] as const,
  check: (input: DuplicateDetectionInput) =>
    [...duplicateDetectionKeys.all, 'check', input] as const,
}

// Re-export types
export type { DuplicateMatch }
