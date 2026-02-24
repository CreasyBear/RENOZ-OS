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
import { useFormFieldDisplay } from "./form-field-display-context"
import { extractFieldError, type AnyFieldApi } from "./types"

export interface EmailFieldProps {
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
  const { showErrorsAfterSubmit } = useFormFieldDisplay()
  const error = extractFieldError(field, { showErrorsAfterSubmit })

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
