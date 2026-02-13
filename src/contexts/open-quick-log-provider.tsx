/**
 * Open Quick Log Provider
 *
 * Wraps children with the OpenQuickLog context.
 * Use with useOpenQuickLog() to open the global Quick Log dialog.
 * Passes route context (customerId, opportunityId) when on customer/opportunity pages.
 */
import { useMemo, type ReactNode } from 'react'
import { useParams, useRouterState } from '@tanstack/react-router'
import { OpenQuickLogContext } from './open-quick-log-context'
import type { QuickLogContext } from './open-quick-log-context'

// ============================================================================
// TYPES
// ============================================================================

interface OpenQuickLogProviderProps {
  children: ReactNode
  value: { openQuickLog: () => void }
}

// ============================================================================
// HOOK: Derive context from current route
// ============================================================================

function useQuickLogRouteContext(): QuickLogContext | undefined {
  const params = useParams({ strict: false })
  const { location } = useRouterState()

  return useMemo(() => {
    const customerId = params.customerId as string | undefined
    const opportunityId = params.opportunityId as string | undefined

    // Also check search params for customerId (e.g. /customers/communications?customerId=xxx)
    let searchCustomerId = customerId
    if (!searchCustomerId && typeof location?.search === 'object' && location?.search) {
      const search = location.search as Record<string, unknown>
      searchCustomerId = search.customerId as string | undefined
    }

    if (searchCustomerId || opportunityId) {
      return {
        customerId: searchCustomerId ?? undefined,
        opportunityId: opportunityId ?? undefined,
      }
    }
    return undefined
  }, [params.customerId, params.opportunityId, location?.search])
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OpenQuickLogProvider({ children, value }: OpenQuickLogProviderProps) {
  const context = useQuickLogRouteContext()

  const providerValue = useMemo(
    () => ({ ...value, context }),
    [value, context]
  )

  return (
    <OpenQuickLogContext.Provider value={providerValue}>
      {children}
    </OpenQuickLogContext.Provider>
  )
}
