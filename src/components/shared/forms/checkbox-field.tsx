/**
 * CheckboxField Component
 *
 * Checkbox for boolean values integrated with TanStack Form.
 * Best for confirmations, terms acceptance, and option lists.
 *
 * @example
 * ```tsx
 * <form.Field name="acceptTerms">
 *   {(field) => (
 *     <CheckboxField
 *       field={field}
 *       label="I accept the terms and conditions"
 *       required
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { AlertCircle } from "lucide-react"
import { Checkbox } from "~/components/ui/checkbox"
import { Label } from "~/components/ui/label"
import { cn } from "~/lib/utils"
import { extractFieldError, type AnyFieldApi } from "./types"

export interface CheckboxFieldProps {
  /** TanStack Form field instance for boolean values */
  field: AnyFieldApi<boolean>
  /** Field label */
  label: string
  /** Helper text shown below the checkbox */
  description?: string
  /** Whether the field is required */
  required?: boolean
  /** Additional class names for the wrapper */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

export function CheckboxField({
  field,
  label,
  description,
  required,
  className,
  disabled,
}: CheckboxFieldProps) {
  const error = extractFieldError(field)
  const id = `field-${field.name}`
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={field.state.value ?? false}
          onCheckedChange={(checked) => field.handleChange(checked === true)}
          onBlur={field.handleBlur}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={cn(
            description && descriptionId,
            error && errorId
          ) || undefined}
        />

        <div className="space-y-1 leading-none">
          <Label
            htmlFor={id}
            className={cn(
              "text-sm font-medium cursor-pointer",
              disabled && "cursor-not-allowed opacity-70",
              error && "text-destructive"
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {description && !error && (
            <p id={descriptionId} className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p id={errorId} className="text-sm text-destructive pl-7 flex items-center gap-1" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
