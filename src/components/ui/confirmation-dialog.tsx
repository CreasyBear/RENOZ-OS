/**
 * ConfirmationDialog Component
 *
 * Reusable confirmation dialog using the useConfirmation hook.
 * Provides consistent confirmation UX across the application.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useConfirmation } from '@/hooks';

interface ConfirmationDialogProps {
  children?: React.ReactNode;
}

/**
 * Global confirmation dialog component
 * Should be rendered once at the app root level
 */
export function ConfirmationDialog({ children }: ConfirmationDialogProps) {
  const {
    isOpen,
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant,
    handleConfirm,
    handleCancel,
  } = useConfirmation();

  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={handleCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConfirm()}
              className={
                variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {children}
    </>
  );
}

// Re-export for convenience
export { useConfirmation } from '@/hooks';
