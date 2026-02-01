/**
 * TextareaField Component
 *
 * Multiline text input field integrated with TanStack Form.
 *
 * @example
 * ```tsx
 * <form.Field name="description">
 *   {(field) => (
 *     <TextareaField
 *       field={field}
 *       label="Description"
 *       placeholder="Enter description..."
 *       rows={4}
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { FormField } from "./form-field"
import { cn } from "~/lib/utils"
import type { AnyFieldApi } from "./types"

export interface TextareaFieldProps {
  /** TanStack Form field instance */
  field: AnyFieldApi<string>
  /** Field label */
  label: string
  /** Placeholder text */
  placeholder?: string
  /** Whether the field is required */
  required?: boolean
  /** Helper text */
  description?: string
  /** Number of visible rows */
  rows?: number
  /** Additional class names for the wrapper */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Maximum character length */
  maxLength?: number
}

export function TextareaField({
  field,
  label,
  placeholder,
  required,
  description,
  rows = 3,
  className,
  disabled,
  maxLength,
}: TextareaFieldProps) {
  const rawError = field.state.meta.isTouched && field.state.meta.errors.length > 0
    ? field.state.meta.errors[0]
    : undefined

  const error = typeof rawError === 'string'
    ? rawError
    : rawError?.message

  const currentLength = field.state.value?.length ?? 0

  return (
    <FormField
      label={label}
      name={field.name}
      error={error}
      description={
        maxLength
          ? `${currentLength}/${maxLength} characters${description ? ` • ${description}` : ""}`
          : description
      }
      required={required}
      className={className}
    >
      <textarea
        placeholder={placeholder}
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "md:text-sm",
          "resize-y"
        )}
      />
    </FormField>
  )
}
