/**
 * ConfirmationModal Component
 *
 * Modal for confirming user actions, especially destructive ones.
 *
 * @example
 * ```tsx
 * <ConfirmationModal
 *   open={showDeleteModal}
 *   onOpenChange={setShowDeleteModal}
 *   title="Delete Customer"
 *   message="Are you sure you want to delete this customer? This action cannot be undone."
 *   confirmLabel="Delete"
 *   variant="danger"
 *   onConfirm={handleDelete}
 * />
 * ```
 */
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

export interface ConfirmationModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Modal title */
  title: string
  /** Confirmation message */
  message: string
  /** Confirm button label */
  confirmLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Callback when confirmed */
  onConfirm: () => void
  /** Callback when cancelled */
  onCancel?: () => void
  /** Modal variant - 'danger' for destructive actions */
  variant?: "default" | "danger"
  /** Whether confirm action is in progress */
  isConfirming?: boolean
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  isConfirming = false,
}: ConfirmationModalProps) {
  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isConfirming}
            className={cn(isConfirming && "opacity-50")}
          >
            {isConfirming ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
