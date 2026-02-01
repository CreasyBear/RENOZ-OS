/**
 * FormDialog Component
 *
 * Dialog wrapper for forms with standard layout, header, and footer.
 * Handles dialog state, form submission, and consistent styling.
 *
 * @example
 * ```tsx
 * <FormDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Create Customer"
 *   description="Enter customer details below"
 *   form={form}
 *   submitLabel="Create"
 *   onSubmit={async () => {
 *     await form.handleSubmit()
 *   }}
 * >
 *   <form.Field name="name">
 *     {(field) => <TextField field={field} label="Name" required />}
 *   </form.Field>
 * </FormDialog>
 * ```
 */
import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { FormActions } from "./form-actions"
import { FormErrorSummary } from "./form-error-summary"
import { cn } from "~/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export interface FormDialogProps {
  /** Dialog open state */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Dialog title */
  title: string
  /** Optional dialog description */
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
  /** Dialog content max-width class */
  size?: "sm" | "md" | "lg" | "xl" | "full"
  /** Additional class names for content */
  className?: string
  /** Whether to reset form on close */
  resetOnClose?: boolean
  /** Submit button variant */
  submitVariant?: "default" | "destructive"
  /** Show the close (X) button */
  showCloseButton?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

const sizeClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  full: "sm:max-w-4xl",
}

export function FormDialog({
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
  size = "lg",
  className,
  resetOnClose = true,
  submitVariant = "default",
  showCloseButton = true,
}: FormDialogProps) {
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
    form.handleSubmit()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(sizeClasses[size], className)}
        showCloseButton={showCloseButton}
        onInteractOutside={(e) => {
          // Prevent closing when form is submitting
          if (form.state.isSubmitting) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing when form is submitting
          if (form.state.isSubmitting) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormErrorSummary submitError={submitError} form={form} />

          {children}

          <DialogFooter>
            <FormActions
              form={form}
              submitLabel={submitLabel}
              cancelLabel={cancelLabel}
              loadingLabel={loadingLabel}
              onCancel={handleCancel}
              submitVariant={submitVariant}
              align="right"
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// CONTROLLED VARIANT
// ============================================================================

export interface ControlledFormDialogProps extends Omit<FormDialogProps, 'form'> {
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
 * FormDialog variant for forms not using TanStack Form.
 * Provides the same UI but with manual control over state.
 */
export function ControlledFormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  loadingLabel = "Saving...",
  submitError,
  size = "lg",
  className,
  submitVariant = "default",
  showCloseButton = true,
  isSubmitting = false,
  canSubmit = true,
  errors = [],
  onSubmit,
  onCancel,
}: ControlledFormDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(sizeClasses[size], className)}
        showCloseButton={showCloseButton}
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormErrorSummary submitError={submitError} form={fakeForm} />

          {children}

          <DialogFooter>
            <FormActions
              form={fakeForm}
              submitLabel={submitLabel}
              cancelLabel={cancelLabel}
              loadingLabel={loadingLabel}
              onCancel={handleCancel}
              submitVariant={submitVariant}
              align="right"
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
