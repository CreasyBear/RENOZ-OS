/**
 * TextField Component
 *
 * Text input field integrated with TanStack Form.
 * Automatically handles validation and error display.
 *
 * @example
 * ```tsx
 * <form.Field name="firstName">
 *   {(field) => (
 *     <TextField
 *       field={field}
 *       label="First Name"
 *       placeholder="Enter first name"
 *       required
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { Input } from "~/components/ui/input"
import { FormField } from "./form-field"
import type { FormFieldApi } from "./types"

export interface TextFieldProps {
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
  /** Input type (text, password, etc.) */
  type?: "text" | "password" | "tel" | "url"
  /** Additional class names for the wrapper */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

export function TextField({
  field,
  label,
  placeholder,
  required,
  description,
  type = "text",
  className,
  disabled,
}: TextFieldProps) {
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
        type={type}
        placeholder={placeholder}
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        disabled={disabled}
      />
    </FormField>
  )
}
