/**
 * AlertModal Component
 *
 * Modal for displaying alerts and notifications to users.
 *
 * @example
 * ```tsx
 * <AlertModal
 *   open={showAlert}
 *   onOpenChange={setShowAlert}
 *   title="Success"
 *   message="Your changes have been saved successfully."
 *   variant="success"
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
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react"

export interface AlertModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Modal title */
  title: string
  /** Alert message */
  message: string
  /** Alert variant */
  variant?: "info" | "warning" | "error" | "success"
  /** Dismiss button label */
  dismissLabel?: string
}

const VARIANT_CONFIG = {
  info: {
    icon: Info,
    iconClass: "text-blue-500",
    titleClass: "text-blue-700 dark:text-blue-400",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-yellow-500",
    titleClass: "text-yellow-700 dark:text-yellow-400",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-red-500",
    titleClass: "text-red-700 dark:text-red-400",
  },
  success: {
    icon: CheckCircle,
    iconClass: "text-green-500",
    titleClass: "text-green-700 dark:text-green-400",
  },
}

export function AlertModal({
  open,
  onOpenChange,
  title,
  message,
  variant = "info",
  dismissLabel = "OK",
}: AlertModalProps) {
  const config = VARIANT_CONFIG[variant]
  const Icon = config.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Icon className={cn("h-6 w-6", config.iconClass)} />
            <DialogTitle className={config.titleClass}>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {dismissLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
