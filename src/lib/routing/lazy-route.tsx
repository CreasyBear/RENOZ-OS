/* eslint-disable react-refresh/only-export-components -- Utility exports createLazyRoute + LazyRoute component */
/**
 * Lazy Route Utilities
 *
 * Helper functions for implementing route-level code splitting in TanStack Router.
 * Reduces initial bundle size by loading route components on-demand.
 *
 * @example
 * ```typescript
 * // Instead of direct import:
 * import { HeavyRouteComponent } from './heavy-route'
 *
 * // Use lazy route wrapper:
 * const HeavyRouteComponent = createLazyRoute(() => import('./heavy-route'))
 *
 * export const Route = createFileRoute('/heavy')({
 *   component: HeavyRouteComponent,
 * })
 * ```
 */
import { lazy, Suspense, type ComponentProps, type ComponentType, type ReactNode } from 'react'

/**
 * Props for the lazy route wrapper
 */
interface LazyRouteProps {
  /** Fallback UI shown while route loads */
  fallback?: ReactNode
}

/**
 * Creates a lazy-loaded route component with Suspense boundary
 *
 * @param factory - Dynamic import factory function
 * @param fallback - Optional fallback component (defaults to route skeleton)
 * @returns Lazy-loaded component wrapped in Suspense
 */
export function createLazyRoute<T extends Record<string, ComponentType>>(
  factory: () => Promise<T>,
  _fallback?: ReactNode
): ComponentType<LazyRouteProps> {
  // Extract the default export or first named export
  const LazyComponent = lazy(() =>
    factory().then((module) => ({
      default: module.default || Object.values(module)[0],
    }))
  )

  return function LazyRouteWrapper({ fallback: routeFallback }: LazyRouteProps = {}) {
    return (
      <Suspense fallback={routeFallback || <DefaultRouteSkeleton />}>
        <LazyComponent />
      </Suspense>
    )
  }
}

/**
 * Default skeleton shown while lazy routes load
 */
function DefaultRouteSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

/**
 * Creates a lazy-loaded component for tab panels
 * Useful for conditionally rendered tabs that should load on-demand
 *
 * @example
 * ```typescript
 * const HeavyTabContent = createLazyTab(() => import('./heavy-tab'))
 *
 * <TabsContent value="heavy">
 *   <HeavyTabContent />
 * </TabsContent>
 * ```
 */
export function createLazyTab<T extends Record<string, ComponentType<object>>>(
  factory: () => Promise<T>,
  fallback?: ReactNode
): ComponentType<ComponentProps<T[keyof T]>> {
  const LazyComponent = lazy(() =>
    factory().then((module) => ({
      default: module.default || Object.values(module)[0],
    }))
  )

  return function LazyTabWrapper(props: ComponentProps<T[keyof T]>) {
    return (
      <Suspense fallback={fallback || <TabSkeleton />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

/**
 * Skeleton for tab content while loading
 */
function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="bg-muted h-8 w-1/3 animate-pulse rounded" />
      <div className="space-y-2">
        <div className="bg-muted h-24 animate-pulse rounded" />
        <div className="bg-muted h-24 animate-pulse rounded" />
        <div className="bg-muted h-24 animate-pulse rounded" />
      </div>
    </div>
  )
}

/**
 * Preloads a route component for faster navigation
 * Call this on hover or when predicting a navigation
 *
 * @example
 * ```typescript
 * const handleMouseEnter = () => {
 *   preloadRoute(() => import('./target-route'))
 * }
 * ```
 */
export function preloadRoute(factory: () => Promise<unknown>): void {
  // Use requestIdleCallback if available, otherwise setImmediate
  const schedule =
    typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? window.requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 1)

  schedule(() => {
    factory().catch(() => {
      // Silently fail - component will still load when needed
    })
  })
}
