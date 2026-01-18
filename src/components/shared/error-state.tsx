/**
 * ErrorState Component
 *
 * Displays error messages with optional retry button.
 *
 * @example
 * ```tsx
 * <ErrorState
 *   title="Failed to load customers"
 *   message={error.message}
 *   onRetry={() => refetch()}
 * />
 * ```
 */
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

export interface ErrorStateProps {
  /** Error title */
  title?: string
  /** Error message */
  message: string
  /** Retry callback */
  onRetry?: () => void
  /** Retry button label */
  retryLabel?: string
  /** Whether retry is in progress */
  isRetrying?: boolean
  /** Additional class names */
  className?: string
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  isRetrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center py-8", className)}>
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-2">
          {message}
        </AlertDescription>
      </Alert>

      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-4"
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isRetrying && "animate-spin")}
          />
          {isRetrying ? "Retrying..." : retryLabel}
        </Button>
      )}
    </div>
  )
}
