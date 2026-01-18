/**
 * EmailField Component
 *
 * Email input field with built-in email validation display.
 * Integrates with TanStack Form.
 *
 * @example
 * ```tsx
 * <form.Field name="email">
 *   {(field) => (
 *     <EmailField
 *       field={field}
 *       label="Email Address"
 *       required
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { Input } from "~/components/ui/input"
import { FormField } from "./form-field"
import type { FormFieldApi } from "./types"

export interface EmailFieldProps {
  /** TanStack Form field instance */
  field: FormFieldApi
  /** Field label */
  label: string
  /** Placeholder text */
  placeholder?: string
  /** Whether the field is required */
  required?: boolean
  /** Helper text */
  description?: string
  /** Additional class names for the wrapper */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

export function EmailField({
  field,
  label,
  placeholder = "email@example.com",
  required,
  description,
  className,
  disabled,
}: EmailFieldProps) {
  const rawError = field.state.meta.isTouched && field.state.meta.errors.length > 0
    ? field.state.meta.errors[0]
    : undefined

  const error = typeof rawError === 'string'
    ? rawError
    : rawError?.message

  return (
    <FormField
      label={label}
      name={field.name}
      error={error}
      description={description}
      required={required}
      className={className}
    >
      <Input
        type="email"
        placeholder={placeholder}
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        disabled={disabled}
        autoComplete="email"
      />
    </FormField>
  )
}
