/**
 * LoadingState Component
 *
 * Displays loading indicators with spinner or skeleton variants.
 *
 * @example
 * ```tsx
 * // Spinner variant
 * <LoadingState variant="spinner" text="Loading customers..." />
 *
 * // Skeleton variant
 * <LoadingState variant="skeleton" lines={3} />
 *
 * // Skeleton cards
 * <LoadingState variant="skeleton" layout="cards" count={4} />
 * ```
 */
import { Loader2 } from "lucide-react"
import { Skeleton } from "~/components/ui/skeleton"
import { cn } from "~/lib/utils"

export interface LoadingStateProps {
  /** Loading variant */
  variant?: "spinner" | "skeleton"
  /** Text to show with spinner */
  text?: string
  /** Number of skeleton lines */
  lines?: number
  /** Skeleton layout */
  layout?: "lines" | "cards" | "table"
  /** Number of skeleton items (for cards/table) */
  count?: number
  /** Additional class names */
  className?: string
}

export function LoadingState({
  variant = "spinner",
  text = "Loading...",
  lines = 3,
  layout = "lines",
  count = 3,
  className,
}: LoadingStateProps) {
  if (variant === "spinner") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8",
          className
        )}
        role="status"
        aria-label={text}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        {text && (
          <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        )}
      </div>
    )
  }

  // Skeleton variant
  if (layout === "cards") {
    return (
      <div
        className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
        role="status"
        aria-label="Loading content"
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (layout === "table") {
    return (
      <div className={cn("space-y-2", className)} role="status" aria-label="Loading table">
        {/* Header */}
        <div className="flex gap-4 py-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
        </div>
        {/* Rows */}
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-t">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        ))}
      </div>
    )
  }

  // Default: lines layout
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Loading content">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </div>
  )
}
