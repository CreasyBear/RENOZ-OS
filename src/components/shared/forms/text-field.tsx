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
import { useFormFieldDisplay } from "./form-field-display-context"
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
  /** Input type (text, password, tel, url, email). For date fields, use DateField (Date | null) or DateStringField (string). */
  type?: "text" | "password" | "tel" | "url" | "email"
  /** Autocomplete attribute for form autofill */
  autocomplete?: string
  /** Input mode for mobile keyboards */
  inputMode?: "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search"
  /** Whether to disable spellcheck */
  spellCheck?: boolean
  /** Additional class names for the wrapper */
  className?: string
  /** When true, hide the label (visually, still for a11y) */
  hideLabel?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Optional additional blur handler (called after field.handleBlur) */
  onBlur?: () => void
  /** Optional callback when value changes (e.g. to clear field-level validation state) */
  onChange?: (value: string) => void
  /**
   * When true, show errors when field has errors (ignore isTouched).
   * Use for auth forms so submit-time validation errors are visible.
   */
  showErrorsAfterSubmit?: boolean
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
  hideLabel,
  disabled,
  onBlur,
  onChange,
  showErrorsAfterSubmit: showErrorsAfterSubmitProp,
}: TextFieldProps) {
  const { showErrorsAfterSubmit: showErrorsFromContext } = useFormFieldDisplay()
  const showErrorsAfterSubmit = showErrorsAfterSubmitProp ?? showErrorsFromContext

  const hasErrors = field.state.meta.errors.length > 0
  const shouldShowError = showErrorsAfterSubmit ? hasErrors : (field.state.meta.isTouched && hasErrors)
  const rawError = shouldShowError ? field.state.meta.errors[0] : undefined

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
      hideLabel={hideLabel}
    >
      <Input
        type={type}
        placeholder={placeholder}
        value={field.state.value ?? ""}
        onChange={(e) => {
          const value = e.target.value;
          field.handleChange(value);
          onChange?.(value);
        }}
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
