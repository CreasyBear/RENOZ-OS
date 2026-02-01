/**
 * DateField Component
 *
 * Date picker field integrated with TanStack Form.
 * Wraps the existing DatePicker UI component with form integration.
 *
 * @example
 * ```tsx
 * <form.Field name="dueDate">
 *   {(field) => (
 *     <DateField
 *       field={field}
 *       label="Due Date"
 *       placeholder="Select a date"
 *       required
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { DatePicker } from "~/components/ui/date-picker"
import { FormField } from "./form-field"
import { extractFieldError, type AnyFieldApi } from "./types"

export interface DateFieldProps {
  /** TanStack Form field instance for Date values */
  field: AnyFieldApi<Date | null>
  /** Field label */
  label: string
  /** Placeholder text when no date selected */
  placeholder?: string
  /** Whether the field is required */
  required?: boolean
  /** Helper text */
  description?: string
  /** Additional class names for the wrapper */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Minimum selectable date */
  minDate?: Date
  /** Maximum selectable date */
  maxDate?: Date
}

export function DateField({
  field,
  label,
  placeholder = "Pick a date",
  required,
  description,
  className,
  disabled,
  minDate,
  maxDate,
}: DateFieldProps) {
  const error = extractFieldError(field)

  const handleDateChange = (date: Date | undefined) => {
    field.handleChange(date ?? null)
    field.handleBlur()
  }

  return (
    <FormField
      label={label}
      name={field.name}
      error={error}
      description={description}
      required={required}
      className={className}
    >
      <DatePicker
        date={field.state.value ?? undefined}
        onDateChange={handleDateChange}
        placeholder={placeholder}
        disabled={disabled}
        fromDate={minDate}
        toDate={maxDate}
      />
    </FormField>
  )
}
