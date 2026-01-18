/**
 * FeatureHint Component
 *
 * Contextual help tooltips that appear near new features to guide users.
 * Supports three variants: tooltip, popover, and spotlight.
 *
 * Features:
 * - Auto-dismiss on click outside or "Got it" button
 * - Persisted dismissal state per user
 * - Accessible with ARIA attributes and keyboard navigation
 * - Supports reduced motion preferences
 * - Info color accent for visual distinction
 *
 * @example
 * ```tsx
 * // Tooltip variant (hover/focus)
 * <FeatureHint
 *   hintId="new-filter-button"
 *   variant="tooltip"
 *   content="Filter results by date, status, or category"
 * >
 *   <Button>Filter</Button>
 * </FeatureHint>
 *
 * // Popover variant (auto-show with dismiss)
 * <FeatureHint
 *   hintId="dashboard-quick-actions"
 *   variant="popover"
 *   title="Quick Actions"
 *   content="Create customers, quotes, and orders from here"
 *   learnMoreHref="/docs/quick-actions"
 * >
 *   <QuickActionsPanel />
 * </FeatureHint>
 * ```
 */
import { useState, useCallback, useId, useEffect, useRef } from "react"
import { X, Info, ExternalLink } from "lucide-react"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover"
import { useDismissedHint } from "~/lib/empty-states/hooks/use-dismissed-hints"

// ============================================================================
// TYPES
// ============================================================================

export type FeatureHintVariant = "tooltip" | "popover" | "spotlight"

export interface FeatureHintProps {
  /** Unique identifier for this hint (used for dismissal persistence) */
  hintId: string
  /** Visual variant of the hint */
  variant?: FeatureHintVariant
  /** Title (popover/spotlight only) */
  title?: string
  /** Main content/description */
  content: string
  /** Optional "Learn more" link URL */
  learnMoreHref?: string
  /** Optional "Learn more" link text */
  learnMoreText?: string
  /** Side to display on (tooltip/popover) */
  side?: "top" | "right" | "bottom" | "left"
  /** Alignment */
  align?: "start" | "center" | "end"
  /** Children to wrap (the target element) */
  children: React.ReactNode
  /** Additional class name for the trigger wrapper */
  className?: string
  /** Force show even if dismissed (for demo purposes) */
  forceShow?: boolean
}

// ============================================================================
// TOOLTIP VARIANT
// ============================================================================

interface TooltipHintProps extends FeatureHintProps {
  isDismissed: boolean
}

function TooltipHint({
  content,
  side = "top",
  align = "center",
  children,
  className,
  isDismissed,
}: TooltipHintProps) {
  const contentId = useId()

  if (isDismissed) {
    return <div className={className}>{children}</div>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex", className)} aria-describedby={contentId}>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent
        id={contentId}
        side={side}
        align={align}
        role="tooltip"
        className="max-w-[250px] border-l-4 border-l-blue-500"
      >
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p>{content}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// POPOVER VARIANT
// ============================================================================

interface PopoverHintProps extends FeatureHintProps {
  isDismissed: boolean
  dismiss: () => void
}

function PopoverHint({
  hintId: _hintId,
  title,
  content,
  learnMoreHref,
  learnMoreText = "Learn more",
  side = "bottom",
  align = "start",
  children,
  className,
  isDismissed,
  dismiss,
}: PopoverHintProps) {
  const [open, setOpen] = useState(!isDismissed)
  const titleId = useId()
  const descriptionId = useId()
  const gotItRef = useRef<HTMLButtonElement>(null)

  // Auto-focus "Got it" button when popover opens
  useEffect(() => {
    if (open && gotItRef.current) {
      // Delay to allow animation
      const timer = setTimeout(() => {
        gotItRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleDismiss = useCallback(() => {
    setOpen(false)
    dismiss()
  }, [dismiss])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss()
      }
    },
    [handleDismiss]
  )

  if (isDismissed) {
    return <div className={className}>{children}</div>
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("inline-flex relative", className)}>
          {children}
          {/* Attention pulse indicator */}
          {!isDismissed && (
            <span
              className={cn(
                "absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500",
                "motion-safe:animate-pulse"
              )}
              aria-hidden="true"
            />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        role="dialog"
        aria-modal="false"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-80 border-l-4 border-l-blue-500",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2",
          "motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0"
        )}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          aria-label="Dismiss tip"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Header */}
        <div className="flex items-start gap-2 pr-8">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            {title && (
              <h4 id={titleId} className="font-medium text-sm mb-1">
                {title}
              </h4>
            )}
            <p id={descriptionId} className="text-sm text-muted-foreground">
              {content}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <Button
            ref={gotItRef}
            size="sm"
            variant="default"
            onClick={handleDismiss}
            className="min-h-11 min-w-20"
          >
            Got it
          </Button>
          {learnMoreHref && (
            <a
              href={learnMoreHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 min-h-11"
            >
              {learnMoreText}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>

        {/* Screen reader announcement */}
        <div role="status" aria-live="polite" className="sr-only">
          Tip: {content}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// SPOTLIGHT VARIANT
// ============================================================================

interface SpotlightHintProps extends FeatureHintProps {
  isDismissed: boolean
  dismiss: () => void
}

function SpotlightHint({
  title,
  content,
  learnMoreHref,
  learnMoreText = "Learn more",
  children,
  className,
  isDismissed,
  dismiss,
}: SpotlightHintProps) {
  const [isVisible, setIsVisible] = useState(!isDismissed)
  const targetRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  // Focus trap within popover
  useEffect(() => {
    if (isVisible && popoverRef.current) {
      const focusableElements = popoverRef.current.querySelectorAll<HTMLElement>(
        'button, a, input, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    }
  }, [isVisible])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    dismiss()
  }, [dismiss])

  // Handle escape key
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, handleDismiss])

  if (isDismissed || !isVisible) {
    return <div className={className}>{children}</div>
  }

  return (
    <>
      {/* Target element */}
      <div ref={targetRef} className={cn("relative z-[60]", className)}>
        {children}
        {/* Highlight ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-lg ring-4 ring-blue-500/50 pointer-events-none",
            "motion-safe:animate-pulse"
          )}
          aria-hidden="true"
        />
      </div>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 dark:bg-black/70",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300"
        )}
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Popover */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={descriptionId}
        className={cn(
          "fixed z-[70] w-80 max-w-[90vw] p-4 rounded-lg border bg-popover text-popover-foreground shadow-lg",
          "border-l-4 border-l-blue-500",
          "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:delay-300"
        )}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-10 w-10 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          aria-label="Dismiss tip"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Content */}
        <div className="flex items-start gap-2 pr-8">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            {title && (
              <h4 id={titleId} className="font-medium text-sm mb-1">
                {title}
              </h4>
            )}
            <p id={descriptionId} className="text-sm text-muted-foreground">
              {content}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <Button
            size="sm"
            variant="default"
            onClick={handleDismiss}
            className="min-h-11 min-w-20"
          >
            Got it
          </Button>
          {learnMoreHref && (
            <a
              href={learnMoreHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 min-h-11"
            >
              {learnMoreText}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>

        {/* Screen reader announcement */}
        <div role="status" aria-live="assertive" className="sr-only">
          Important tip: {content}
        </div>
      </div>
    </>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FeatureHint({
  hintId,
  variant = "popover",
  forceShow = false,
  ...props
}: FeatureHintProps) {
  const { isDismissed: isHintDismissed, dismiss } = useDismissedHint(hintId)
  const isDismissed = forceShow ? false : isHintDismissed

  switch (variant) {
    case "tooltip":
      return <TooltipHint {...props} hintId={hintId} isDismissed={isDismissed} />
    case "popover":
      return (
        <PopoverHint
          {...props}
          hintId={hintId}
          isDismissed={isDismissed}
          dismiss={dismiss}
        />
      )
    case "spotlight":
      return (
        <SpotlightHint
          {...props}
          hintId={hintId}
          isDismissed={isDismissed}
          dismiss={dismiss}
        />
      )
    default:
      return (
        <PopoverHint
          {...props}
          hintId={hintId}
          isDismissed={isDismissed}
          dismiss={dismiss}
        />
      )
  }
}
