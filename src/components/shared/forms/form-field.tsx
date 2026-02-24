/**
 * FormField Component
 *
 * Base field wrapper providing consistent layout for form fields.
 * Handles label, description, error display, and required indicator.
 *
 * **Accessibility:** The direct `children` element receives `id`, `aria-invalid`,
 * and `aria-describedby` via cloneElement. For correct label association and
 * screen reader announcements, the child must be the focusable input (Input,
 * select, etc.). If you pass a wrapper (e.g. div with nested Input), the props
 * will land on the wrapper, not the input.
 *
 * ## Orientations
 * - `vertical` (default): Label above input, full-width
 * - `horizontal`: Label and input side-by-side (for settings forms)
 * - `responsive`: Vertical on mobile, horizontal on larger screens
 *
 * ## Data Slots (for custom styling)
 * The component exposes `data-slot` attributes for CSS targeting:
 * - `data-slot="field"` - Root container
 * - `data-slot="field-label"` - Label element
 * - `data-slot="field-control"` - Input wrapper
 * - `data-slot="field-description"` - Helper text
 * - `data-slot="field-error"` - Error message(s)
 *
 * @example
 * ```tsx
 * // Vertical (default)
 * <FormField label="Email" error={field.state.meta.errors[0]} required>
 *   <Input {...field.getInputProps()} />
 * </FormField>
 *
 * // Horizontal for settings
 * <FormField label="Enable notifications" orientation="horizontal">
 *   <Switch checked={enabled} onCheckedChange={setEnabled} />
 * </FormField>
 *
 * // Custom styling via data-slot
 * .my-form [data-slot="field-label"] { font-weight: bold; }
 * ```
 */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle } from "lucide-react"
import { Label } from "~/components/ui/label"
import { cn } from "~/lib/utils"

// ============================================================================
// TYPES FOR CHILD ELEMENT PROPS
// ============================================================================

/**
 * Props that FormField injects into child input elements via cloneElement.
 * Child components should accept these props for proper accessibility.
 */
interface InjectedFieldProps {
  id?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

// ============================================================================
// VARIANTS
// ============================================================================

const fieldVariants = cva(
  "group/field flex w-full data-[invalid=true]:text-destructive",
  {
    variants: {
      orientation: {
        vertical: "flex-col gap-2 [&>*]:w-full",
        horizontal: "flex-row items-center gap-4 [&>[data-slot=field-label]]:min-w-[120px] [&>[data-slot=field-label]]:flex-shrink-0 [&>[data-slot=field-control]]:flex-1",
        responsive: "flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 [&>*]:w-full sm:[&>[data-slot=field-label]]:min-w-[120px] sm:[&>[data-slot=field-label]]:w-auto sm:[&>[data-slot=field-control]]:flex-1",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
)

// ============================================================================
// TYPES
// ============================================================================

export interface FormFieldProps extends VariantProps<typeof fieldVariants> {
  /** Field label */
  label: string
  /** Unique identifier for the field */
  name: string
  /** Error message(s) to display - can be a single string or array of strings */
  error?: string | string[]
  /** Helper text shown below the field */
  description?: string
  /** Whether the field is required */
  required?: boolean
  /** Additional class names */
  className?: string
  /** Field content (input, select, etc.) */
  children: React.ReactNode
  /** Label width for horizontal layouts (CSS value) */
  labelWidth?: string
  /** Hide the label visually (still accessible) */
  hideLabel?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FormField({
  label,
  name,
  error,
  description,
  required,
  className,
  children,
  orientation,
  labelWidth,
  hideLabel,
}: FormFieldProps) {
  const id = `field-${name}`
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`

  const isHorizontal = orientation === "horizontal" || orientation === "responsive"

  // Normalize error to array for consistent handling
  const errors = error ? (Array.isArray(error) ? error : [error]).filter(Boolean) : []
  const hasError = errors.length > 0
  const hasMultipleErrors = errors.length > 1

  return (
    <div
      data-slot="field"
      data-invalid={hasError || undefined}
      className={cn(fieldVariants({ orientation }), className)}
    >
      <Label
        htmlFor={id}
        data-slot="field-label"
        className={cn(
          hasError && "text-destructive",
          hideLabel && "sr-only",
          isHorizontal && "text-sm font-medium"
        )}
        style={labelWidth && isHorizontal ? { minWidth: labelWidth, width: labelWidth } : undefined}
      >
        {label}
        {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
      </Label>

      <div data-slot="field-control" className="flex flex-col gap-1.5">
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<InjectedFieldProps>, {
              id,
              "aria-invalid": hasError,
              "aria-describedby": cn(
                hasError && errorId,
                description && descriptionId
              ) || undefined,
            })
          : children}

        {description && !hasError && (
          <p
            id={descriptionId}
            data-slot="field-description"
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}

        {hasError && (
          <div
            id={errorId}
            data-slot="field-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {hasMultipleErrors ? (
              // Multiple errors: render as list
              <ul className="space-y-1 list-none p-0 m-0">
                {errors.map((err, index) => (
                  <li key={index} className="flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
                    {err}
                  </li>
                ))}
              </ul>
            ) : (
              // Single error: inline display
              <p className="flex items-center gap-1 m-0">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
                {errors[0]}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// FIELD GROUP
// ============================================================================

const fieldGroupVariants = cva(
  "@container/field-group grid gap-4",
  {
    variants: {
      columns: {
        1: "grid-cols-1",
        2: "grid-cols-1 @md/field-group:grid-cols-2",
        3: "grid-cols-1 @md/field-group:grid-cols-2 @lg/field-group:grid-cols-3",
        4: "grid-cols-1 @sm/field-group:grid-cols-2 @lg/field-group:grid-cols-4",
        auto: "grid-cols-1 @sm/field-group:grid-cols-2 @md/field-group:grid-cols-3 @lg/field-group:grid-cols-4",
      },
    },
    defaultVariants: {
      columns: 1,
    },
  }
)

export interface FieldGroupProps extends VariantProps<typeof fieldGroupVariants> {
  /** Group content (FormField components) */
  children: React.ReactNode
  /** Additional class names */
  className?: string
}

/**
 * FieldGroup - Container for grouping form fields in a grid layout.
 *
 * Uses container queries for responsive column layouts.
 *
 * @example
 * ```tsx
 * <FieldGroup columns={2}>
 *   <form.Field name="firstName">
 *     {(field) => <TextField field={field} label="First Name" />}
 *   </form.Field>
 *   <form.Field name="lastName">
 *     {(field) => <TextField field={field} label="Last Name" />}
 *   </form.Field>
 * </FieldGroup>
 * ```
 */
export function FieldGroup({ children, className, columns }: FieldGroupProps) {
  return (
    <div
      data-slot="field-group"
      className={cn(fieldGroupVariants({ columns }), className)}
    >
      {children}
    </div>
  )
}

// ============================================================================
// FIELD SET
// ============================================================================

export interface FieldSetProps {
  /** Legend/title for the fieldset */
  legend: string
  /** Optional description below the legend */
  description?: string
  /** Fieldset content */
  children: React.ReactNode
  /** Additional class names */
  className?: string
  /** Collapsible state (if enabled) */
  collapsible?: boolean
  /** Default collapsed state */
  defaultCollapsed?: boolean
}

/**
 * FieldSet - Semantic HTML fieldset with styled legend.
 *
 * Use to group related fields under a common heading.
 *
 * @example
 * ```tsx
 * <FieldSet legend="Contact Information" description="How can we reach you?">
 *   <FieldGroup columns={2}>
 *     <TextField field={emailField} label="Email" />
 *     <TextField field={phoneField} label="Phone" />
 *   </FieldGroup>
 * </FieldSet>
 * ```
 */
export function FieldSet({
  legend,
  description,
  children,
  className,
  collapsible = false,
  defaultCollapsed = false,
}: FieldSetProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

  const content = (
    <div className={cn("space-y-4", collapsible && isCollapsed && "hidden")}>
      {children}
    </div>
  )

  return (
    <fieldset
      data-slot="fieldset"
      className={cn(
        "border border-border rounded-lg p-4 space-y-4",
        className
      )}
    >
      <FieldLegend
        collapsible={collapsible}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      >
        {legend}
      </FieldLegend>

      {description && !isCollapsed && (
        <p className="text-sm text-muted-foreground -mt-2">{description}</p>
      )}

      {content}
    </fieldset>
  )
}

// ============================================================================
// FIELD LEGEND
// ============================================================================

interface FieldLegendProps {
  /** Legend text */
  children: React.ReactNode
  /** Additional class names */
  className?: string
  /** Whether the fieldset is collapsible */
  collapsible?: boolean
  /** Current collapsed state */
  isCollapsed?: boolean
  /** Toggle callback */
  onToggle?: () => void
}

/**
 * FieldLegend - Styled legend for FieldSet.
 *
 * Typically used internally by FieldSet, but can be used standalone.
 */
export function FieldLegend({
  children,
  className,
  collapsible,
  isCollapsed,
  onToggle,
}: FieldLegendProps) {
  if (collapsible) {
    return (
      <legend
        data-slot="field-legend"
        className={cn("text-sm font-semibold text-foreground px-1", className)}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 hover:text-primary transition-colors"
          aria-expanded={!isCollapsed}
        >
          <svg
            className={cn(
              "h-4 w-4 transition-transform motion-reduce:transition-none",
              isCollapsed && "-rotate-90"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {children}
        </button>
      </legend>
    )
  }

  return (
    <legend
      data-slot="field-legend"
      className={cn("text-sm font-semibold text-foreground px-1", className)}
    >
      {children}
    </legend>
  )
}
