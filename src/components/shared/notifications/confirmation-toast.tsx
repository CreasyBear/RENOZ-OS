/**
 * ConfirmationToast Component
 *
 * Specialized toast for destructive actions with undo capability.
 * Shows a countdown indicator and allows users to undo within the time window.
 *
 * @example
 * ```tsx
 * import { showConfirmationToast } from '~/components/shared/notifications'
 *
 * // Delete with undo
 * showConfirmationToast({
 *   message: '3 items deleted',
 *   variant: 'destructive',
 *   onUndo: () => restoreItems(itemIds),
 *   onConfirm: () => permanentlyDelete(itemIds),
 * })
 * ```
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Trash2, AlertTriangle, Undo2, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

export interface ConfirmationToastOptions {
  /** Message to display */
  message: string
  /** Number of affected items (shown in message) */
  itemCount?: number
  /** Toast variant */
  variant?: 'destructive' | 'warning'
  /** Duration in milliseconds before action completes */
  duration?: number
  /** Called when user clicks Undo or presses Escape */
  onUndo?: () => void | Promise<void>
  /** Called when countdown completes (action confirmed) */
  onConfirm?: () => void | Promise<void>
}

interface ConfirmationToastContentProps extends ConfirmationToastOptions {
  toastId: string | number
  onUndoComplete: () => void
  onConfirmComplete: () => void
}

function ConfirmationToastContent({
  message,
  itemCount,
  variant = 'destructive',
  duration = 5000,
  onUndo,
  onConfirm,
  toastId,
  onUndoComplete,
  onConfirmComplete,
}: ConfirmationToastContentProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration)
  const [isPaused, setIsPaused] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const pausedTimeRef = useRef<number>(0)

  const Icon = variant === 'destructive' ? Trash2 : AlertTriangle

  // Handle countdown
  useEffect(() => {
    if (isPaused || isProcessing) return

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current
      const remaining = Math.max(0, duration - elapsed)
      setTimeRemaining(remaining)

      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        handleConfirm()
      }
    }, 100)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPaused, isProcessing, duration])

  const handleUndo = useCallback(async () => {
    setIsProcessing(true)
    if (intervalRef.current) clearInterval(intervalRef.current)

    try {
      await onUndo?.()
      toast.dismiss(toastId)
      toast.success('Action undone', { duration: 2000 })
      onUndoComplete()
    } catch {
      toast.error('Failed to undo action')
    } finally {
      setIsProcessing(false)
    }
  }, [onUndo, toastId, onUndoComplete])

  const handleConfirm = useCallback(async () => {
    setIsProcessing(true)

    try {
      await onConfirm?.()
      toast.dismiss(toastId)
      onConfirmComplete()
    } catch {
      toast.error('Action failed')
    } finally {
      setIsProcessing(false)
    }
  }, [onConfirm, toastId, onConfirmComplete])

  const handleDismiss = () => {
    handleConfirm()
  }

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault()
        handleUndo()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, isProcessing])

  const progress = (timeRemaining / duration) * 100
  const secondsRemaining = Math.ceil(timeRemaining / 1000)

  const displayMessage = itemCount && itemCount > 1
    ? `${itemCount} items ${message}`
    : message

  return (
    <div
      className="relative flex items-center gap-3 pr-2"
      onMouseEnter={() => {
        setIsPaused(true)
        pausedTimeRef.current = Date.now() - startTimeRef.current - (duration - timeRemaining)
      }}
      onMouseLeave={() => {
        startTimeRef.current = Date.now() - (duration - timeRemaining)
        pausedTimeRef.current = 0
        setIsPaused(false)
      }}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      role="alertdialog"
      aria-live="assertive"
      aria-atomic="true"
      aria-labelledby="toast-title"
      aria-describedby="toast-description"
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 p-1.5 rounded-full',
          variant === 'destructive' ? 'bg-destructive/10' : 'bg-warning/10'
        )}
      >
        <Icon
          className={cn(
            'h-5 w-5',
            variant === 'destructive' ? 'text-destructive' : 'text-warning'
          )}
          aria-hidden="true"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p id="toast-title" className="text-sm font-medium">
          {displayMessage}
        </p>
        <p id="toast-description" className="text-xs text-muted-foreground mt-0.5">
          {secondsRemaining}s to undo {isPaused && '(paused)'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={isProcessing}
          className="min-h-9 px-3"
          aria-label="Undo action"
        >
          <Undo2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Undo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          disabled={isProcessing}
          className="min-h-9 min-w-9 p-0"
          aria-label="Dismiss and confirm action"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Countdown bar */}
      <div
        className={cn(
          'absolute bottom-0 left-0 h-1 rounded-b-lg transition-all duration-100',
          variant === 'destructive' ? 'bg-destructive' : 'bg-warning'
        )}
        style={{ width: `${progress}%` }}
        role="progressbar"
        aria-valuenow={secondsRemaining}
        aria-valuemin={0}
        aria-valuemax={duration / 1000}
        aria-label="Time remaining to undo"
      />
    </div>
  )
}

/**
 * Show a confirmation toast with undo capability
 */
export function showConfirmationToast(options: ConfirmationToastOptions): string | number {
  const { duration = 5000, ...restOptions } = options

  const toastId = toast.custom(
    (id) => (
      <ConfirmationToastContent
        {...restOptions}
        duration={duration}
        toastId={id}
        onUndoComplete={() => {}}
        onConfirmComplete={() => {}}
      />
    ),
    {
      duration: Infinity, // We handle dismissal manually
      className: cn(
        'group',
        'bg-card border rounded-lg shadow-lg p-4',
        options.variant === 'destructive'
          ? 'border-destructive/30'
          : 'border-warning/30'
      ),
    }
  )

  return toastId
}
