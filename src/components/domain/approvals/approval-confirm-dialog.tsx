/**
 * Approval Confirm Dialog Component
 *
 * Dialog for confirming approve/reject actions on a purchase order.
 * Approve: optional comment
 * Reject: required reason and comment
 */

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrgFormat } from '@/hooks/use-org-format';
import {
  approvalRejectionReasons,
  approvalRejectionReasonLabels,
  type ApprovalActionBarOrder,
  type ApprovalRejectionReason,
} from '@/lib/schemas/approvals';

// ============================================================================
// TYPES
// ============================================================================

interface ApprovalConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'approve' | 'reject';
  order: ApprovalActionBarOrder;
  onConfirm: (data: { comment?: string; reason?: string }) => Promise<void>;
  isProcessing?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ApprovalConfirmDialog({
  open,
  onOpenChange,
  action,
  order,
  onConfirm,
  isProcessing = false,
}: ApprovalConfirmDialogProps) {
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState<ApprovalRejectionReason | ''>('');
  const [error, setError] = useState<string | null>(null);
  const { formatCurrency } = useOrgFormat();

  const isApprove = action === 'approve';

  const handleConfirm = async () => {
    setError(null);

    // Validation for reject
    if (!isApprove) {
      if (!reason) {
        setError('Please select a reason for rejection');
        return;
      }
      if (!comment.trim()) {
        setError('Please provide additional details for the rejection');
        return;
      }
    }

    await onConfirm({
      comment: comment.trim() || undefined,
      reason: reason || undefined,
    });

    // Reset form
    setComment('');
    setReason('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isProcessing) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setComment('');
        setReason('');
        setError(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isApprove ? 'Approve Purchase Order?' : 'Reject Purchase Order?'}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? 'Once approved, this order will be ready to send to the supplier.'
              : 'The order will be returned to draft status for revision.'}
          </DialogDescription>
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

          {/* Reject-specific fields */}
          {!isApprove && (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The order will be returned to draft status for revision.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Reason for Rejection *</Label>
                <RadioGroup
                  value={reason}
                  onValueChange={(value) => setReason(value as ApprovalRejectionReason)}
                  disabled={isProcessing}
                >
                  {approvalRejectionReasons.map((r) => (
                    <div key={r} className="flex items-center space-x-2">
                      <RadioGroupItem value={r} id={`reason-${r}`} />
                      <Label htmlFor={`reason-${r}`} className="font-normal">
                        {approvalRejectionReasonLabels[r]}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </>
          )}

          {/* Comment field */}
          <div className="space-y-2">
            <Label htmlFor="confirm-comment">
              {isApprove ? 'Add Comment (optional)' : 'Additional Comments *'}
            </Label>
            <Textarea
              id="confirm-comment"
              placeholder={
                isApprove
                  ? 'Add any notes for the record...'
                  : 'Please explain the rejection in detail...'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              disabled={isProcessing}
            />
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isApprove ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { ApprovalConfirmDialogProps };
