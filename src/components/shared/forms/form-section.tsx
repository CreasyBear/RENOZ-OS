/**
 * FormSection Component
 *
 * Groups related form fields with optional title and description.
 * Creates visual separation between form sections.
 *
 * @example
 * ```tsx
 * <FormSection title="Contact Information" description="How we can reach you">
 *   <TextField ... />
 *   <EmailField ... />
 *   <TextField ... />
 * </FormSection>
 * ```
 */
import * as React from "react"
import { cn } from "~/lib/utils"

export interface FormSectionProps {
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Form fields */
  children: React.ReactNode
  /** Additional class names */
  className?: string
  /** Layout direction for fields */
  layout?: "vertical" | "horizontal" | "grid"
  /** Number of columns for grid layout */
  columns?: 2 | 3 | 4
}

export function FormSection({
  title,
  description,
  children,
  className,
  layout = "vertical",
  columns = 2,
}: FormSectionProps) {
  const layoutClasses = {
    vertical: "space-y-4",
    horizontal: "flex flex-wrap gap-4",
    grid: cn(
      "grid gap-4",
      columns === 2 && "grid-cols-1 md:grid-cols-2",
      columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
    ),
  }

  return (
    <fieldset className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <legend className="text-base font-semibold leading-none">
              {title}
            </legend>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className={layoutClasses[layout]}>{children}</div>
    </fieldset>
  )
}
