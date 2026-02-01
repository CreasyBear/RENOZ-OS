/**
 * SwitchField Component
 *
 * Toggle switch for boolean values integrated with TanStack Form.
 * Best for on/off settings with immediate visual feedback.
 *
 * @example
 * ```tsx
 * <form.Field name="isActive">
 *   {(field) => (
 *     <SwitchField
 *       field={field}
 *       label="Active"
 *       description="Enable this to make the item visible"
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { AlertCircle } from "lucide-react"
import { Switch } from "~/components/ui/switch"
import { Label } from "~/components/ui/label"
import { cn } from "~/lib/utils"
import { extractFieldError, type AnyFieldApi } from "./types"

export interface SwitchFieldProps {
  /** TanStack Form field instance for boolean values */
  field: AnyFieldApi<boolean>
  /** Field label */
  label: string
  /** Helper text */
  description?: string
  /** Additional class names for the wrapper */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Layout orientation */
  orientation?: "horizontal" | "vertical"
}

export function SwitchField({
  field,
  label,
  description,
  className,
  disabled,
  orientation = "horizontal",
}: SwitchFieldProps) {
  const error = extractFieldError(field)
  const id = `field-${field.name}`
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined

  // Build aria-describedby from available IDs
  const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div
      className={cn(
        "space-y-2",
        orientation === "horizontal" && "flex items-center justify-between",
        className
      )}
    >
      <div className="space-y-0.5">
        <Label
          htmlFor={id}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            error && "text-destructive"
          )}
        >
          {label}
        </Label>
        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <Switch
        id={id}
        checked={field.state.value ?? false}
        onCheckedChange={field.handleChange}
        onBlur={field.handleBlur}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={ariaDescribedBy}
      />

      {error && (
        <p id={errorId} className="text-sm text-destructive flex items-center gap-1" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
