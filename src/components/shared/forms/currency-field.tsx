/**
 * CurrencyField Component
 *
 * Currency input field with formatting.
 * Displays currency symbol and formats on blur.
 *
 * @example
 * ```tsx
 * <form.Field name="price">
 *   {(field) => (
 *     <CurrencyField
 *       field={field}
 *       label="Price"
 *       currency="AUD"
 *       required
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { Input } from "~/components/ui/input"
import { FormField } from "./form-field"
import { useFormFieldDisplay } from "./form-field-display-context"
import { cn } from "~/lib/utils"
import { extractFieldError, type AnyFieldApi } from "./types"

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "$",
  USD: "$",
  EUR: "€",
  GBP: "£",
}

export interface CurrencyFieldProps {
  /** TanStack Form field instance */
  field: AnyFieldApi<string>
  /** Field label */
  label: string
  /** Currency code (AUD, USD, EUR, GBP) */
  currency?: string
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

export function CurrencyField({
  field,
  label,
  currency = "AUD",
  placeholder = "0.00",
  required,
  description,
  className,
  disabled,
}: CurrencyFieldProps) {
  const symbol = CURRENCY_SYMBOLS[currency] ?? "$"
  const { showErrorsAfterSubmit } = useFormFieldDisplay()
  const error = extractFieldError(field, { showErrorsAfterSubmit })

  // Format value for display
  const formatValue = (value: string): string => {
    if (!value) return ""
    const num = parseFloat(value)
    if (isNaN(num)) return value
    return num.toFixed(2)
  }

  // Parse input to store as number string
  const parseValue = (input: string): string => {
    // Remove currency symbols and commas
    const cleaned = input.replace(/[^0-9.-]/g, "")
    return cleaned
  }

  const handleBlur = () => {
    field.handleBlur()
    // Format on blur
    const currentValue = field.state.value ?? ""
    const formatted = formatValue(currentValue)
    if (formatted !== currentValue) {
      field.handleChange(formatted)
    }
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
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {symbol}
        </span>
        <Input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={field.state.value ?? ""}
          onChange={(e) => field.handleChange(parseValue(e.target.value))}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn("pl-7")}
        />
      </div>
    </FormField>
  )
}
