/**
 * FormActions Component
 *
 * Standard submit/cancel button group for forms.
 * Handles loading states and form validation status.
 *
 * @example
 * ```tsx
 * <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
 *   ... fields ...
 *   <FormActions
 *     form={form}
 *     submitLabel="Create Customer"
 *     onCancel={() => navigate(-1)}
 *   />
 * </form>
 * ```
 */
import { Loader2 } from "lucide-react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export interface FormActionsProps {
  /** TanStack Form instance */
  form: {
    state: {
      isSubmitting: boolean
      canSubmit: boolean
    }
  }
  /** Submit button label */
  submitLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Loading state label */
  loadingLabel?: string
  /** Cancel click handler */
  onCancel?: () => void
  /** Additional class names */
  className?: string
  /** Button alignment */
  align?: "left" | "center" | "right" | "between"
  /** Button size */
  size?: "default" | "sm" | "lg"
  /** Show cancel button */
  showCancel?: boolean
  /** Disable submit based on external condition */
  submitDisabled?: boolean
  /** Submit button variant */
  submitVariant?: "default" | "destructive"
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FormActions({
  form,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  loadingLabel = "Saving...",
  onCancel,
  className,
  align = "right",
  size = "default",
  showCancel = true,
  submitDisabled = false,
  submitVariant = "default",
}: FormActionsProps) {
  const { isSubmitting, canSubmit } = form.state
  const isDisabled = isSubmitting || !canSubmit || submitDisabled

  const alignmentClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 pt-4",
        alignmentClasses[align],
        className
      )}
    >
      {showCancel && onCancel && (
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelLabel}
        </Button>
      )}

      <Button
        type="submit"
        variant={submitVariant}
        size={size}
        disabled={isDisabled}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
            {loadingLabel}
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  )
}

// ============================================================================
// ALTERNATIVE: Standalone Buttons
// ============================================================================

export interface SubmitButtonProps {
  /** Loading state */
  isLoading?: boolean
  /** Can submit (form is valid) */
  canSubmit?: boolean
  /** Submit button label */
  label?: string
  /** Loading state label */
  loadingLabel?: string
  /** Button size */
  size?: "default" | "sm" | "lg"
  /** Additional class names */
  className?: string
  /** Submit button variant */
  variant?: "default" | "destructive"
  /** Externally disabled */
  disabled?: boolean
}

/**
 * Standalone submit button for custom form layouts.
 */
export function SubmitButton({
  isLoading = false,
  canSubmit = true,
  label = "Submit",
  loadingLabel = "Saving...",
  size = "default",
  className,
  variant = "default",
  disabled = false,
}: SubmitButtonProps) {
  const isDisabled = isLoading || !canSubmit || disabled

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={isDisabled}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  )
}
