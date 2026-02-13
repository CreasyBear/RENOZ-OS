/**
 * ConfirmationDialog Component
 *
 * Reusable confirmation dialog using the useConfirmation hook.
 * Provides consistent confirmation UX across the application.
 */

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    isConfirming,
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant,
    requireReason,
    reasonLabel,
    reasonPlaceholder,
    handleConfirm,
    handleCancel,
  } = useConfirmation();
  const [reason, setReason] = useState("");

  const isReasonInvalid = requireReason && reason.trim().length === 0;
  const isConfirmDisabled = isReasonInvalid || isConfirming;
  const handleConfirmClick = async () => {
    const didClose = await handleConfirm(reason.trim() || undefined);
    if (didClose) {
      setReason("");
    }
  };
  const handleCancelClick = () => {
    setReason("");
    handleCancel();
  };

  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={handleCancelClick}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </AlertDialogHeader>
          {requireReason && (
            <div className="space-y-2">
              <Label htmlFor="confirmation-reason">{reasonLabel}</Label>
              <Textarea
                id="confirmation-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={reasonPlaceholder}
                className="min-h-24"
                aria-invalid={isReasonInvalid}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClick} disabled={isConfirming}>
              {cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClick}
              disabled={isConfirmDisabled}
              className={
                variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {isConfirming ? "Working..." : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {children}
    </>
  );
}

