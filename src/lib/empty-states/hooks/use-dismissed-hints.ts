/**
 * Dismissed Hints Hook
 *
 * Manages the state of dismissed feature hints for the current user.
 * Uses localStorage for immediate UI updates and syncs with server for persistence.
 *
 * @example
 * ```tsx
 * function NewFeatureButton() {
 *   const { isDismissed, dismiss } = useDismissedHints("feature-button-hint")
 *
 *   if (isDismissed) return <Button>New Feature</Button>
 *
 *   return (
 *     <FeatureHint hintId="feature-button-hint" onDismiss={dismiss}>
 *       <Button>New Feature</Button>
 *     </FeatureHint>
 *   )
 * }
 * ```
 */
import { useCallback, useEffect, useState, useMemo, startTransition } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getDismissedHints,
  dismissHint,
} from "~/server/hints"

// ============================================================================
// CONSTANTS
// ============================================================================

const LOCAL_STORAGE_KEY = "renoz_dismissed_hints"

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

function getLocalDismissedHints(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function setLocalDismissedHints(hints: Set<string>): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...hints]))
  } catch {
    // Ignore localStorage errors
  }
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const dismissedHintsKeys = {
  all: ["dismissedHints"] as const,
  list: () => [...dismissedHintsKeys.all, "list"] as const,
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseDismissedHintsResult {
  /** Check if a specific hint has been dismissed */
  isDismissed: (hintId: string) => boolean
  /** Dismiss a hint (updates immediately in UI, syncs to server) */
  dismiss: (hintId: string) => void
  /** All dismissed hint IDs */
  dismissedHints: Set<string>
  /** Whether the hints are being loaded from server */
  isLoading: boolean
  /** Whether a dismiss operation is in progress */
  isDismissing: boolean
}

export function useDismissedHints(): UseDismissedHintsResult {
  const queryClient = useQueryClient()

  // Local state for immediate updates
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(() =>
    getLocalDismissedHints()
  )

  // Fetch server-side dismissed hints
  const { data: serverDismissed, isLoading } = useQuery({
    queryKey: dismissedHintsKeys.list(),
    queryFn: async () => {
      const hints = await getDismissedHints()
      return new Set(hints)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })

  // Merge local and server dismissed hints
  const dismissedHints = useMemo(() => {
    const merged = new Set(localDismissed)
    if (serverDismissed) {
      for (const hint of serverDismissed) {
        merged.add(hint)
      }
    }
    return merged
  }, [localDismissed, serverDismissed])

  // Sync server hints to localStorage when loaded. Defer setState to avoid sync setState in effect.
  useEffect(() => {
    if (serverDismissed && serverDismissed.size > 0) {
      const merged = new Set([...localDismissed, ...serverDismissed])
      setLocalDismissedHints(merged)
      startTransition(() => setLocalDismissed(merged))
    }
  }, [serverDismissed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dismiss mutation
  const { mutate: dismissMutate, isPending: isDismissing } = useMutation({
    mutationFn: async (hintId: string) => {
      return await dismissHint({ data: { hintId } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dismissedHintsKeys.list() })
    },
  })

  // Check if a hint is dismissed
  const isDismissed = useCallback(
    (hintId: string): boolean => {
      return dismissedHints.has(hintId)
    },
    [dismissedHints]
  )

  // Dismiss a hint
  const dismiss = useCallback(
    (hintId: string): void => {
      // Immediate local update
      setLocalDismissed((prev) => {
        const next = new Set(prev)
        next.add(hintId)
        setLocalDismissedHints(next)
        return next
      })

      // Sync to server
      dismissMutate(hintId)
    },
    [dismissMutate]
  )

  return {
    isDismissed,
    dismiss,
    dismissedHints,
    isLoading,
    isDismissing,
  }
}

// ============================================================================
// SINGLE HINT HOOK (CONVENIENCE)
// ============================================================================

/**
 * Convenience hook for checking/dismissing a single hint.
 */
export function useDismissedHint(hintId: string) {
  const { isDismissed, dismiss, isLoading, isDismissing } = useDismissedHints()

  return {
    isDismissed: isDismissed(hintId),
    dismiss: useCallback(() => dismiss(hintId), [dismiss, hintId]),
    isLoading,
    isDismissing,
  }
}
