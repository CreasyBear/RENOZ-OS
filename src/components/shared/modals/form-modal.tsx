/**
 * FormModal Component
 *
 * Modal wrapper for forms with consistent submit/cancel behavior.
 *
 * @example
 * ```tsx
 * <FormModal
 *   open={showEditModal}
 *   onOpenChange={setShowEditModal}
 *   title="Edit Customer"
 *   onSubmit={handleSubmit}
 *   isSubmitting={isSubmitting}
 * >
 *   <form.Field name="name">
 *     {(field) => <TextField field={field} label="Name" />}
 *   </form.Field>
 * </FormModal>
 * ```
 */
import type { ReactNode, FormEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

export interface FormModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Modal title */
  title: string
  /** Optional description */
  description?: string
  /** Form content */
  children: ReactNode
  /** Submit handler */
  onSubmit: (e: FormEvent) => void
  /** Cancel handler */
  onCancel?: () => void
  /** Submit button label */
  submitLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Whether form is submitting */
  isSubmitting?: boolean
  /** Additional class names for the content */
  className?: string
  /** Modal size */
  size?: "sm" | "md" | "lg" | "xl"
}

const SIZE_CLASSES = {
  sm: "sm:max-w-[425px]",
  md: "sm:max-w-[550px]",
  lg: "sm:max-w-[700px]",
  xl: "sm:max-w-[900px]",
}

export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting = false,
  className,
  size = "md",
}: FormModalProps) {
  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(e)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(SIZE_CLASSES[size], className)}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="py-4">{children}</div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(isSubmitting && "opacity-50")}
            >
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
