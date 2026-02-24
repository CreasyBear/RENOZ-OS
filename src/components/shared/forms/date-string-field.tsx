/**
 * DateStringField Component
 *
 * Date picker field integrated with TanStack Form.
 * Stores date as string (YYYY-MM-DD) for API compatibility.
 * Uses format() from date-fns for local date (avoids toISOString timezone bugs).
 *
 * @example
 * ```tsx
 * <form.Field name="paymentDate">
 *   {(field) => (
 *     <DateStringField
 *       field={field}
 *       label="Payment Date"
 *       placeholder="Select a date"
 *       required
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { format } from "date-fns";
import { DatePicker } from "~/components/ui/date-picker";
import { FormField } from "./form-field";
import { useFormFieldDisplay } from "./form-field-display-context";
import { extractFieldError, type FormFieldWithType } from "./types";

export interface DateStringFieldProps {
  /** TanStack Form field instance for string (YYYY-MM-DD) values */
  field: FormFieldWithType<string | null | undefined>;
  /** Field label */
  label: string;
  /** Placeholder text when no date selected */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Helper text */
  description?: string;
  /** Additional class names for the wrapper */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
}

function parseDate(value: string | null | undefined): Date | undefined {
  if (!value || typeof value !== "string") return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export function DateStringField({
  field,
  label,
  placeholder = "Pick a date",
  required,
  description,
  className,
  disabled,
  minDate,
  maxDate,
}: DateStringFieldProps) {
  const { showErrorsAfterSubmit } = useFormFieldDisplay();
  const error = extractFieldError(field, { showErrorsAfterSubmit });

  const dateValue = parseDate(field.state.value ?? undefined);

  const handleDateChange = (date: Date | undefined) => {
    field.handleChange(date ? format(date, "yyyy-MM-dd") : null);
    field.handleBlur();
  };

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
        date={dateValue}
        onDateChange={handleDateChange}
        placeholder={placeholder}
        disabled={disabled}
        fromDate={minDate}
        toDate={maxDate}
      />
    </FormField>
  );
}
