/**
 * QueryState Component
 *
 * Unified wrapper that handles loading, error, and empty states.
 * Designed to work seamlessly with TanStack Query results.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useQuery(['customers'], fetchCustomers)
 *
 * <QueryState
 *   isLoading={isLoading}
 *   error={error}
 *   data={data}
 *   emptyMessage="No customers found"
 *   onRetry={() => refetch()}
 * >
 *   <CustomerList customers={data} />
 * </QueryState>
 * ```
 */
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { LoadingState, type LoadingStateProps } from "./loading-state"
import { ErrorState } from "./error-state"
import { EmptyState } from "./empty-state"
import { cn } from "~/lib/utils"

export interface QueryStateProps {
  /** Whether data is loading */
  isLoading: boolean
  /** Error object (if any) */
  error?: Error | null
  /** Data to check for empty state */
  data?: unknown[] | null
  /** Message when data is empty */
  emptyMessage?: string
  /** Title for empty state */
  emptyTitle?: string
  /** Icon for empty state */
  emptyIcon?: LucideIcon
  /** Action for empty state */
  emptyAction?: {
    label: string
    onClick: () => void
  }
  /** Retry callback for error state */
  onRetry?: () => void
  /** Whether retry is in progress */
  isRetrying?: boolean
  /** Loading variant */
  loadingVariant?: LoadingStateProps["variant"]
  /** Loading layout (for skeleton) */
  loadingLayout?: LoadingStateProps["layout"]
  /** Loading text (for spinner) */
  loadingText?: string
  /** Children to render when data is available */
  children: ReactNode
  /** Additional class names */
  className?: string
}

export function QueryState({
  isLoading,
  error,
  data,
  emptyMessage = "No data found",
  emptyTitle,
  emptyIcon,
  emptyAction,
  onRetry,
  isRetrying = false,
  loadingVariant = "skeleton",
  loadingLayout = "lines",
  loadingText,
  children,
  className,
}: QueryStateProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn(className)}>
        <LoadingState
          variant={loadingVariant}
          layout={loadingLayout}
          text={loadingText}
        />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn(className)}>
        <ErrorState
          message={error.message}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      </div>
    )
  }

  // Empty state (data is array and empty)
  if (Array.isArray(data) && data.length === 0) {
    return (
      <div className={cn(className)}>
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          icon={emptyIcon}
          action={emptyAction}
        />
      </div>
    )
  }

  // Success - render children
  return <>{children}</>
}
