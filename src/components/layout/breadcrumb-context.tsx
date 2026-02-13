/* eslint-disable react-refresh/only-export-components -- Context file exports provider + hook */
/**
 * Breadcrumb Override Context
 *
 * Allows detail views (e.g. project, customer) to set a custom label for the
 * current path segment in breadcrumbs, instead of the default from ROUTE_METADATA.
 *
 * @example
 * ```tsx
 * // In ProjectDetailContainer when project loads:
 * setBreadcrumbOverride({ segmentPath: '/projects/' + projectId, label: project.title })
 *
 * // Clear on unmount:
 * useEffect(() => () => setBreadcrumbOverride(null), [])
 * ```
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export interface BreadcrumbOverride {
  segmentPath: string
  label: string
}

type SetBreadcrumbOverride = (override: BreadcrumbOverride | null) => void

const BreadcrumbOverrideContext = createContext<BreadcrumbOverride | null>(null)
const BreadcrumbOverrideSetterContext = createContext<SetBreadcrumbOverride | null>(null)

export function BreadcrumbOverrideProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<BreadcrumbOverride | null>(null)
  const setter = useCallback((value: BreadcrumbOverride | null) => setOverride(value), [])

  return (
    <BreadcrumbOverrideContext.Provider value={override}>
      <BreadcrumbOverrideSetterContext.Provider value={setter}>
        {children}
      </BreadcrumbOverrideSetterContext.Provider>
    </BreadcrumbOverrideContext.Provider>
  )
}

export function useBreadcrumbOverride(): BreadcrumbOverride | null {
  return useContext(BreadcrumbOverrideContext)
}

export function useSetBreadcrumbOverride(): SetBreadcrumbOverride | null {
  return useContext(BreadcrumbOverrideSetterContext)
}
