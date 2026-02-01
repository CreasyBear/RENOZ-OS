/**
 * PhoneField Component
 *
 * Phone number input with formatting integrated with TanStack Form.
 * Supports Australian phone number format and international prefixes.
 *
 * @example
 * ```tsx
 * <form.Field name="phone">
 *   {(field) => (
 *     <PhoneField
 *       field={field}
 *       label="Phone Number"
 *       placeholder="0412 345 678"
 *       required
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { Input } from "~/components/ui/input"
import { FormField } from "./form-field"
import { cn } from "~/lib/utils"
import { extractFieldError, type AnyFieldApi } from "./types"

export interface PhoneFieldProps {
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
  /** Country prefix (e.g., "+61" for Australia) */
  countryPrefix?: string
}

/**
 * Format phone number for display.
 * Handles Australian mobile and landline formats.
 */
function formatPhoneNumber(value: string): string {
  // Remove all non-digits except leading +
  const hasPlus = value.startsWith('+')
  const digits = value.replace(/\D/g, '')

  if (!digits) return ''

  // Australian mobile: 04XX XXX XXX
  if (digits.startsWith('04') && digits.length <= 10) {
    const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 10)]
    return parts.filter(Boolean).join(' ')
  }

  // Australian landline: (0X) XXXX XXXX
  if (digits.startsWith('0') && !digits.startsWith('04') && digits.length <= 10) {
    const parts = [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 10)]
    if (parts[0]) {
      return `(${parts[0]}) ${parts.slice(1).filter(Boolean).join(' ')}`
    }
    return parts.filter(Boolean).join(' ')
  }

  // International format: +XX XXX XXX XXX
  if (hasPlus || digits.startsWith('61')) {
    const formatted = digits.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')
    return hasPlus ? `+${formatted}` : formatted
  }

  // Default: just add spaces every 4 digits
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

/**
 * Clean phone number to store only digits (and optional leading +).
 */
function cleanPhoneNumber(value: string): string {
  const hasPlus = value.startsWith('+')
  const digits = value.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

export function PhoneField({
  field,
  label,
  placeholder = "0412 345 678",
  required,
  description,
  className,
  disabled,
  countryPrefix,
}: PhoneFieldProps) {
  const error = extractFieldError(field)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = cleanPhoneNumber(e.target.value)
    field.handleChange(cleaned)
  }

  const handleBlur = () => {
    field.handleBlur()
    // Format on blur for display
    const currentValue = field.state.value ?? ''
    const formatted = formatPhoneNumber(currentValue)
    if (formatted !== currentValue) {
      field.handleChange(cleanPhoneNumber(formatted))
    }
  }

  // Display formatted value
  const displayValue = formatPhoneNumber(field.state.value ?? '')

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
        {countryPrefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {countryPrefix}
          </span>
        )}
        <Input
          type="tel"
          inputMode="tel"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(countryPrefix && "pl-12")}
        />
      </div>
    </FormField>
  )
}
