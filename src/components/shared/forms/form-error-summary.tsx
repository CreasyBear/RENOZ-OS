/**
 * FormErrorSummary Component
 *
 * Displays form-level errors in a prominent alert.
 * Shows validation errors, submission errors, or custom error messages.
 *
 * @example
 * ```tsx
 * <form>
 *   <FormErrorSummary
 *     form={form}
 *     submitError={mutation.error?.message}
 *   />
 *   ... fields ...
 * </form>
 * ```
 */
import { AlertCircle, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { cn } from "~/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export interface FormErrorSummaryProps {
  /** TanStack Form instance (optional - for form-level errors) */
  form?: {
    state: {
      errors?: (string | undefined)[]
    }
  }
  /** Custom error message (e.g., from mutation) */
  submitError?: string | null
  /** Custom error title */
  title?: string
  /** Additional class names */
  className?: string
  /** Dismissable error */
  onDismiss?: () => void
  /** Show field-level errors in summary */
  showFieldErrors?: boolean
  /** Field errors to display */
  fieldErrors?: Record<string, string | undefined>
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FormErrorSummary({
  form,
  submitError,
  title = "Error",
  className,
  onDismiss,
  showFieldErrors = false,
  fieldErrors = {},
}: FormErrorSummaryProps) {
  // Collect all errors (filter undefined from TanStack Form's errors)
  const formErrors = (form?.state.errors ?? []).filter((e): e is string => !!e)
  const fieldErrorList = showFieldErrors
    ? Object.entries(fieldErrors)
        .filter(([, error]) => error)
        .map(([field, error]) => ({ field, error: error! }))
    : []

  const hasFormErrors = formErrors.length > 0
  const hasFieldErrors = fieldErrorList.length > 0
  const hasSubmitError = !!submitError
  const hasAnyError = hasFormErrors || hasFieldErrors || hasSubmitError

  // Don't render if no errors
  if (!hasAnyError) {
    return null
  }

  return (
    <Alert variant="destructive" className={cn("relative", className)}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {/* Submit error (API/server error) */}
        {submitError && <p className="mb-2">{submitError}</p>}

        {/* Form-level validation errors */}
        {hasFormErrors && (
          <ul className="list-disc list-inside space-y-1">
            {formErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}

        {/* Field-level errors summary */}
        {hasFieldErrors && (
          <div className="mt-2">
            <p className="font-medium mb-1">Please fix the following fields:</p>
            <ul className="list-disc list-inside space-y-1">
              {fieldErrorList.map(({ field, error }) => (
                <li key={field}>
                  <span className="font-medium capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  : {error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Dismiss error"
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </Alert>
  )
}

// ============================================================================
// SIMPLE VARIANT
// ============================================================================

export interface SimpleErrorProps {
  /** Error message */
  message?: string | null
  /** Additional class names */
  className?: string
}

/**
 * Simple inline error message.
 * Use for displaying a single error without the full Alert.
 */
export function SimpleError({ message, className }: SimpleErrorProps) {
  if (!message) return null

  return (
    <p
      className={cn("text-sm text-destructive flex items-center gap-1", className)}
      role="alert"
    >
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  )
}
