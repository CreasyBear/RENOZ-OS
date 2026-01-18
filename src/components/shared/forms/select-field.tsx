/**
 * SelectField Component
 *
 * Dropdown select field integrated with TanStack Form.
 * Uses native select for simplicity and accessibility.
 *
 * @example
 * ```tsx
 * <form.Field name="status">
 *   {(field) => (
 *     <SelectField
 *       field={field}
 *       label="Status"
 *       options={[
 *         { value: "active", label: "Active" },
 *         { value: "inactive", label: "Inactive" },
 *       ]}
 *       required
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { FormField } from "./form-field"
import { cn } from "~/lib/utils"
import type { FormFieldApi } from "./types"

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectFieldProps {
  /** TanStack Form field instance */
  field: FormFieldApi
  /** Field label */
  label: string
  /** Select options */
  options: SelectOption[]
  /** Placeholder text for empty selection */
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

export function SelectField({
  field,
  label,
  options,
  placeholder = "Select an option",
  required,
  description,
  className,
  disabled,
}: SelectFieldProps) {
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
      <select
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "md:text-sm"
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  )
}
