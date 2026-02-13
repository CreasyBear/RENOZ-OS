/**
 * NumberField Component
 *
 * Numeric input field integrated with TanStack Form.
 * Supports min/max constraints, step increments, stepper buttons, and formatting.
 *
 * Note: This component handles empty values as undefined/null, not 0.
 * This ensures proper validation behavior for required fields.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <form.Field name="quantity">
 *   {(field) => (
 *     <NumberField
 *       field={field}
 *       label="Quantity"
 *       min={1}
 *       max={100}
 *       step={1}
 *       required
 *     />
 *   )}
 * </form.Field>
 *
 * // With stepper buttons
 * <form.Field name="quantity">
 *   {(field) => (
 *     <NumberField
 *       field={field}
 *       label="Quantity"
 *       showStepper
 *       min={0}
 *       max={10}
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { useState, useEffect, useCallback, startTransition } from "react"
import { Minus, Plus } from "lucide-react"
import { Input } from "~/components/ui/input"
import { FormField } from "./form-field"
import { cn } from "~/lib/utils"
import { extractFieldError, type FormFieldWithType } from "./types"

export interface NumberFieldProps {
  /** TanStack Form field instance for number values (supports null/undefined for empty) */
  field: FormFieldWithType<number | null | undefined>
  /** Field label */
  label: string
  /** Placeholder text */
  placeholder?: string
  /** Whether the field is required */
  required?: boolean
  /** Helper text */
  description?: string
  /** Minimum allowed value */
  min?: number
  /** Maximum allowed value */
  max?: number
  /** Step increment for value changes */
  step?: number
  /** Additional class names for the wrapper */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Prefix to display (e.g., "qty") */
  prefix?: string
  /** Suffix to display (e.g., "units") */
  suffix?: string
  /** Show increment/decrement stepper buttons */
  showStepper?: boolean
  /** Stepper button size */
  stepperSize?: "sm" | "default"
  /** Hide the label visually (for compact layouts) */
  hideLabel?: boolean
}

export function NumberField({
  field,
  label,
  placeholder,
  required,
  description,
  min,
  max,
  step = 1,
  className,
  disabled,
  prefix,
  suffix,
  showStepper = false,
  stepperSize = "default",
  hideLabel = false,
}: NumberFieldProps) {
  const error = extractFieldError(field)

  // Track internal string representation for proper empty state handling
  const [internalValue, setInternalValue] = useState<string>(() => {
    const val = field.state.value
    return val != null ? String(val) : ""
  })

  // Sync internal state when external value changes (e.g., form reset).
  // Defer via startTransition to avoid synchronous setState in effect (cascading renders).
  useEffect(() => {
    const val = field.state.value
    const newInternalValue = val != null ? String(val) : ""
    if (newInternalValue !== internalValue && val !== parseFloat(internalValue)) {
      startTransition(() => setInternalValue(newInternalValue))
    }
  }, [field.state.value]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentValue = field.state.value ?? 0

  const canDecrement = min === undefined || currentValue > min
  const canIncrement = max === undefined || currentValue < max

  const handleIncrement = useCallback(() => {
    if (!canIncrement || disabled) return
    const newValue = currentValue + step
    const clampedValue = max !== undefined ? Math.min(newValue, max) : newValue
    field.handleChange(clampedValue)
    setInternalValue(String(clampedValue))
  }, [currentValue, step, max, canIncrement, disabled, field])

  const handleDecrement = useCallback(() => {
    if (!canDecrement || disabled) return
    const newValue = currentValue - step
    const clampedValue = min !== undefined ? Math.max(newValue, min) : newValue
    field.handleChange(clampedValue)
    setInternalValue(String(clampedValue))
  }, [currentValue, step, min, canDecrement, disabled, field])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    setInternalValue(rawValue)

    // Empty value = null/undefined (NOT 0)
    if (rawValue === '' || rawValue === '-') {
      field.handleChange(undefined as number | null | undefined)
      return
    }

    // Parse as number
    const numValue = step === 1 || Number.isInteger(step)
      ? parseInt(rawValue, 10)
      : parseFloat(rawValue)

    if (!isNaN(numValue)) {
      field.handleChange(numValue)
    }
    // If NaN, keep the string in internal state but don't update form
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (showStepper) {
        if (e.key === "ArrowUp") {
          e.preventDefault()
          handleIncrement()
        } else if (e.key === "ArrowDown") {
          e.preventDefault()
          handleDecrement()
        }
      }
    },
    [showStepper, handleIncrement, handleDecrement]
  )

  const stepperButtonClass = cn(
    "shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "transition-colors",
    stepperSize === "sm" ? "h-8 w-8" : "h-10 w-10"
  )

  const iconSize = stepperSize === "sm" ? "h-3 w-3" : "h-4 w-4"

  // Stepper layout
  if (showStepper) {
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
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || !canDecrement}
            className={cn(stepperButtonClass, "rounded-l-md border-r-0")}
            aria-label="Decrease value"
          >
            <Minus className={cn(iconSize, "mx-auto")} />
          </button>
          <Input
            type="number"
            inputMode={step === 1 || Number.isInteger(step) ? "numeric" : "decimal"}
            placeholder={placeholder}
            value={internalValue}
            onChange={handleChange}
            onBlur={field.handleBlur}
            onKeyDown={handleKeyDown}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={cn(
              "rounded-none text-center border-x-0 focus-visible:z-10",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              stepperSize === "sm" && "h-8"
            )}
          />
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || !canIncrement}
            className={cn(stepperButtonClass, "rounded-r-md border-l-0")}
            aria-label="Increase value"
          >
            <Plus className={cn(iconSize, "mx-auto")} />
          </button>
        </div>
      </FormField>
    )
  }

  // Standard layout with optional prefix/suffix
  const inputElement = (
    <Input
      type="number"
      inputMode={step === 1 || Number.isInteger(step) ? "numeric" : "decimal"}
      placeholder={placeholder}
      value={internalValue}
      onChange={handleChange}
      onBlur={field.handleBlur}
      onKeyDown={handleKeyDown}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={prefix || suffix ? "text-right" : undefined}
    />
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
      {prefix || suffix ? (
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-muted-foreground text-sm">
              {prefix}
            </span>
          )}
          <div className="w-full">
            {inputElement}
          </div>
          {suffix && (
            <span className="absolute right-3 text-muted-foreground text-sm">
              {suffix}
            </span>
          )}
        </div>
      ) : (
        inputElement
      )}
    </FormField>
  )
}
