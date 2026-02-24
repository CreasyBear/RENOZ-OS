/**
 * FormSheet Component
 *
 * Sheet/drawer wrapper for forms with standard layout.
 * Useful for edit forms that need more space than a dialog.
 *
 * @example
 * ```tsx
 * <FormSheet
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Edit Customer"
 *   description="Update customer details"
 *   form={form}
 *   submitLabel="Save Changes"
 *   side="right"
 * >
 *   <form.Field name="name">
 *     {(field) => <TextField field={field} label="Name" required />}
 *   </form.Field>
 * </FormSheet>
 * ```
 */
import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet"
import { FormActions } from "./form-actions"
import { FormErrorSummary } from "./form-error-summary"
import { FormFieldDisplayProvider, type FormWithSubscribe } from "./form-field-display-context"
import { ScrollArea } from "~/components/ui/scroll-area"
import { cn } from "~/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export interface FormSheetProps {
  /** Sheet open state */
  open: boolean
  /** Callback when sheet open state changes */
  onOpenChange: (open: boolean) => void
  /** Sheet title */
  title: string
  /** Optional sheet description */
  description?: string
  /** Form instance for submit/cancel button states */
  form: {
    state: {
      isSubmitting: boolean
      canSubmit: boolean
      errors: string[]
    }
    handleSubmit: () => void | Promise<void>
    reset: () => void
    Subscribe?: FormWithSubscribe['Subscribe']
  }
  /** Form content (fields) */
  children: React.ReactNode
  /** Submit button label */
  submitLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Loading state label */
  loadingLabel?: string
  /** External error message (e.g., from mutation) */
  submitError?: string | null
  /** Sheet side */
  side?: "top" | "right" | "bottom" | "left"
  /** Sheet width class (only applies to left/right) */
  width?: "sm" | "md" | "lg" | "xl"
  /** Additional class names for content */
  className?: string
  /** Whether to reset form on close */
  resetOnClose?: boolean
  /** Submit button variant */
  submitVariant?: "default" | "destructive"
}

// ============================================================================
// COMPONENT
// ============================================================================

const widthClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
}

export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  form,
  children,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  loadingLabel = "Saving...",
  submitError,
  side = "right",
  width = "md",
  className,
  resetOnClose = true,
  submitVariant = "default",
}: FormSheetProps) {
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && resetOnClose && !form.state.isSubmitting) {
      form.reset()
    }
    onOpenChange(newOpen)
  }

  const handleCancel = () => {
    if (!form.state.isSubmitting) {
      handleOpenChange(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    void form.handleSubmit()
  }

  const isHorizontal = side === "left" || side === "right"

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          isHorizontal && widthClasses[width],
          "flex flex-col",
          className
        )}
        onInteractOutside={(e) => {
          if (form.state.isSubmitting) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          if (form.state.isSubmitting) {
            e.preventDefault()
          }
        }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 pb-4">
              <FormErrorSummary submitError={submitError} form={form} />
              <FormFieldDisplayProvider form={form}>
                {children}
              </FormFieldDisplayProvider>
            </div>
          </ScrollArea>

          <SheetFooter>
            <FormActions
              form={form}
              submitLabel={submitLabel}
              cancelLabel={cancelLabel}
              loadingLabel={loadingLabel}
              onCancel={handleCancel}
              submitVariant={submitVariant}
              align="right"
              className="pt-0"
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// CONTROLLED VARIANT
// ============================================================================

export interface ControlledFormSheetProps extends Omit<FormSheetProps, 'form'> {
  /** Whether form is submitting */
  isSubmitting?: boolean
  /** Whether form can submit */
  canSubmit?: boolean
  /** Form errors */
  errors?: string[]
  /** Custom submit handler */
  onSubmit: () => void | Promise<void>
  /** Custom cancel handler */
  onCancel?: () => void
}

/**
 * FormSheet variant for forms not using TanStack Form.
 * Provides the same UI but with manual control over state.
 */
export function ControlledFormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  loadingLabel = "Saving...",
  submitError,
  side = "right",
  width = "md",
  className,
  submitVariant = "default",
  isSubmitting = false,
  canSubmit = true,
  errors = [],
  onSubmit,
  onCancel,
}: ControlledFormSheetProps) {
  const handleCancel = () => {
    if (!isSubmitting) {
      onCancel?.()
      onOpenChange(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onSubmit()
  }

  const fakeForm = {
    state: { isSubmitting, canSubmit, errors },
  }

  const isHorizontal = side === "left" || side === "right"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          isHorizontal && widthClasses[width],
          "flex flex-col",
          className
        )}
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 pb-4">
              <FormErrorSummary submitError={submitError} form={fakeForm} />
              {children}
            </div>
          </ScrollArea>

          <SheetFooter>
            <FormActions
              form={fakeForm}
              submitLabel={submitLabel}
              cancelLabel={cancelLabel}
              loadingLabel={loadingLabel}
              onCancel={handleCancel}
              submitVariant={submitVariant}
              align="right"
              className="pt-0"
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
