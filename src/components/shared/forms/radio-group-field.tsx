/**
 * RadioGroupField Component
 *
 * Radio button group for selecting one option from a set.
 * Best for 3-5 mutually exclusive options.
 *
 * @example
 * ```tsx
 * <form.Field name="priority">
 *   {(field) => (
 *     <RadioGroupField
 *       field={field}
 *       label="Priority"
 *       options={[
 *         { value: "low", label: "Low", description: "No rush" },
 *         { value: "medium", label: "Medium", description: "Standard" },
 *         { value: "high", label: "High", description: "Urgent" },
 *       ]}
 *       required
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { AlertCircle } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { Label } from "~/components/ui/label"
import { cn } from "~/lib/utils"
import { extractFieldError, type AnyFieldApi } from "./types"

// ============================================================================
// TYPES
// ============================================================================

export interface RadioOption {
  /** Option value */
  value: string
  /** Display label */
  label: string
  /** Optional description */
  description?: string
  /** Disabled state */
  disabled?: boolean
}

export interface RadioGroupFieldProps {
  /** TanStack Form field instance */
  field: AnyFieldApi<string>
  /** Field label */
  label: string
  /** Radio options */
  options: RadioOption[]
  /** Whether the field is required */
  required?: boolean
  /** Helper text */
  description?: string
  /** Additional class names for the wrapper */
  className?: string
  /** Disabled state for all options */
  disabled?: boolean
  /** Layout orientation */
  orientation?: "vertical" | "horizontal"
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RadioGroupField({
  field,
  label,
  options,
  required,
  description,
  className,
  disabled,
  orientation = "vertical",
}: RadioGroupFieldProps) {
  const error = extractFieldError(field)
  const id = `field-${field.name}`

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <Label
          htmlFor={id}
          className={cn(error && "text-destructive")}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {description && !error && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <RadioGroup
        id={id}
        value={field.state.value ?? ""}
        onValueChange={field.handleChange}
        onBlur={field.handleBlur}
        disabled={disabled}
        className={cn(
          orientation === "horizontal" && "flex flex-wrap gap-4",
          orientation === "vertical" && "space-y-3"
        )}
        aria-invalid={!!error}
      >
        {options.map((option) => (
          <div
            key={option.value}
            className={cn(
              "flex items-start gap-3",
              option.description && "items-start"
            )}
          >
            <RadioGroupItem
              value={option.value}
              id={`${id}-${option.value}`}
              disabled={disabled || option.disabled}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor={`${id}-${option.value}`}
                className={cn(
                  "font-normal cursor-pointer",
                  (disabled || option.disabled) && "cursor-not-allowed opacity-70"
                )}
              >
                {option.label}
              </Label>
              {option.description && (
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </RadioGroup>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// CARD VARIANT
// ============================================================================

export interface RadioCardFieldProps extends Omit<RadioGroupFieldProps, 'orientation'> {
  /** Number of columns in grid */
  columns?: 1 | 2 | 3 | 4
}

/**
 * Radio group displayed as selectable cards.
 * Better for options with longer descriptions.
 */
export function RadioCardField({
  field,
  label,
  options,
  required,
  description,
  className,
  disabled,
  columns = 2,
}: RadioCardFieldProps) {
  const error = extractFieldError(field)
  const id = `field-${field.name}`

  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <Label
          htmlFor={id}
          className={cn(error && "text-destructive")}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {description && !error && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <RadioGroup
        id={id}
        value={field.state.value ?? ""}
        onValueChange={field.handleChange}
        onBlur={field.handleBlur}
        disabled={disabled}
        className={cn("grid gap-3", gridClasses[columns])}
        aria-invalid={!!error}
      >
        {options.map((option) => {
          const isSelected = field.state.value === option.value
          const isDisabled = disabled || option.disabled

          return (
            <Label
              key={option.value}
              htmlFor={`${id}-${option.value}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
                isDisabled && "cursor-not-allowed opacity-50"
              )}
            >
              <RadioGroupItem
                value={option.value}
                id={`${id}-${option.value}`}
                disabled={isDisabled}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <span className="font-medium">{option.label}</span>
                {option.description && (
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                )}
              </div>
            </Label>
          )
        })}
      </RadioGroup>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
