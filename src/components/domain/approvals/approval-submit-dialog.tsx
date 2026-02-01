/**
 * Approval Submit Dialog Component
 *
 * Dialog for submitting a purchase order for approval.
 * Shows order summary and optional note field.
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useOrgFormat } from '@/hooks/use-org-format';
import type { ApprovalActionBarOrder } from '@/lib/schemas/approvals';

// ============================================================================
// TYPES
// ============================================================================

interface ApprovalSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ApprovalActionBarOrder;
  onSubmit: (note?: string) => Promise<void>;
  isSubmitting?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ApprovalSubmitDialog({
  open,
  onOpenChange,
  order,
  onSubmit,
  isSubmitting = false,
}: ApprovalSubmitDialogProps) {
  const [note, setNote] = useState('');
  const { formatCurrency } = useOrgFormat();

  const handleSubmit = async () => {
    await onSubmit(note.trim() || undefined);
    setNote('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setNote('');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit for Approval?</DialogTitle>
          <DialogDescription>This order will be sent to a manager for approval.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <p className="font-semibold">{order.poNumber}</p>
                <p className="text-muted-foreground text-sm">
                  {order.supplierName || 'Unknown Supplier'}
                </p>
                <p className="text-lg font-bold">
                  {formatCurrency(order.totalAmount, { cents: false, showCents: true })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Approval Info */}
          <div className="bg-muted/50 rounded-md border p-3">
            <p className="text-muted-foreground text-sm">
              This order will be reviewed by Operations Manager based on the order value.
            </p>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <Label htmlFor="submit-note">Add Note (optional)</Label>
            <Textarea
              id="submit-note"
              placeholder="Add any context or urgency notes for the approver..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { ApprovalSubmitDialogProps };
