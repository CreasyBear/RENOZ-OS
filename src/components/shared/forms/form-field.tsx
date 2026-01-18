/**
 * FormField Component
 *
 * Base field wrapper providing consistent layout for form fields.
 * Handles label, description, error display, and required indicator.
 *
 * @example
 * ```tsx
 * <FormField label="Email" error={field.state.meta.errors[0]} required>
 *   <Input {...field.getInputProps()} />
 * </FormField>
 * ```
 */
import * as React from "react"
import { Label } from "~/components/ui/label"
import { cn } from "~/lib/utils"

export interface FormFieldProps {
  /** Field label */
  label: string
  /** Unique identifier for the field */
  name: string
  /** Error message to display */
  error?: string
  /** Helper text shown below the field */
  description?: string
  /** Whether the field is required */
  required?: boolean
  /** Additional class names */
  className?: string
  /** Field content (input, select, etc.) */
  children: React.ReactNode
}

export function FormField({
  label,
  name,
  error,
  description,
  required,
  className,
  children,
}: FormFieldProps) {
  const id = `field-${name}`
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={id}
        className={cn(error && "text-destructive")}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            "aria-invalid": !!error,
            "aria-describedby": cn(
              error && errorId,
              description && descriptionId
            ) || undefined,
          })
        : children}

      {description && !error && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
