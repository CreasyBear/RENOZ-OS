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
import type { FormFieldWithType } from "./types"

export interface TextFieldProps {
  /** TanStack Form field instance */
  field: FormFieldWithType<string | null | undefined>
  /** Field label */
  label: string
  /** Placeholder text */
  placeholder?: string
  /** Whether the field is required */
  required?: boolean
  /** Helper text */
  description?: string
  /** Input type (text, password, date, etc.) */
  type?: "text" | "password" | "tel" | "url" | "email" | "date"
  /** Autocomplete attribute for form autofill */
  autocomplete?: string
  /** Input mode for mobile keyboards */
  inputMode?: "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search"
  /** Whether to disable spellcheck */
  spellCheck?: boolean
  /** Additional class names for the wrapper */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Optional additional blur handler (called after field.handleBlur) */
  onBlur?: () => void
}

export function TextField({
  field,
  label,
  placeholder,
  required,
  description,
  type = "text",
  autocomplete,
  inputMode,
  spellCheck,
  className,
  disabled,
  onBlur,
}: TextFieldProps) {
  const rawError = field.state.meta.isTouched && field.state.meta.errors.length > 0
    ? field.state.meta.errors[0]
    : undefined

  const error = typeof rawError === 'string'
    ? rawError
    : rawError?.message

  // Auto-detect autocomplete and inputMode based on type if not provided
  const autoAutocomplete = autocomplete ?? (
    type === "email" ? "email" :
    type === "tel" ? "tel" :
    type === "url" ? "url" :
    undefined
  )

  const autoInputMode = inputMode ?? (
    type === "tel" ? "tel" :
    type === "email" ? "email" :
    type === "url" ? "url" :
    undefined
  )

  // Auto-disable spellcheck for email, tel, url, codes
  const autoSpellCheck = spellCheck ?? (
    type === "email" || type === "tel" || type === "url" ? false :
    undefined
  )

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
        onBlur={() => {
          field.handleBlur()
          onBlur?.()
        }}
        disabled={disabled}
        autoComplete={autoAutocomplete}
        inputMode={autoInputMode}
        spellCheck={autoSpellCheck}
      />
    </FormField>
  )
}
