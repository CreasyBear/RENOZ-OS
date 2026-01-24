/**
 * Approval Action Bar Component
 *
 * Displays approval-related actions based on PO status:
 * - Draft: "Submit for Approval" button
 * - Pending Approval: "Approve" and "Reject" buttons with alert banner
 * - Approved: Info that order is ready to send
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle, Send, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApprovalSubmitDialog } from './approval-submit-dialog';
import { ApprovalConfirmDialog } from './approval-confirm-dialog';
import type { ApprovalActionBarOrder } from '@/lib/schemas/approvals';

// ============================================================================
// TYPES
// ============================================================================

interface ApprovalActionBarProps {
  order: ApprovalActionBarOrder;
  canSubmit?: boolean;
  canApprove?: boolean;
  onSubmitForApproval: (note?: string) => Promise<void>;
  onApprove: (comment?: string) => Promise<void>;
  onReject: (reason: string, comment: string) => Promise<void>;
  onMarkAsOrdered?: () => Promise<void>;
  isSubmitting?: boolean;
  isProcessing?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ApprovalActionBar({
  order,
  canSubmit = true,
  canApprove = true,
  onSubmitForApproval,
  onApprove,
  onReject,
  onMarkAsOrdered,
  isSubmitting = false,
  isProcessing = false,
}: ApprovalActionBarProps) {
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  // Draft status - show submit for approval
  if (order.status === 'draft') {
    return (
      <>
        <div className="space-y-4">
          <Button
            size="lg"
            className="w-full"
            onClick={() => setSubmitDialogOpen(true)}
            disabled={!canSubmit || isSubmitting}
          >
            <Send className="mr-2 h-4 w-4" />
            Submit for Approval
          </Button>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Approval Required</AlertTitle>
            <AlertDescription>
              Orders over $5,000 require approval by a manager before sending.
            </AlertDescription>
          </Alert>
        </div>

        <ApprovalSubmitDialog
          open={submitDialogOpen}
          onOpenChange={setSubmitDialogOpen}
          order={order}
          onSubmit={async (note) => {
            await onSubmitForApproval(note);
            setSubmitDialogOpen(false);
          }}
          isSubmitting={isSubmitting}
        />
      </>
    );
  }

  // Pending approval status - show approve/reject for approvers
  if (order.status === 'pending_approval') {
    return (
      <>
        <div className="space-y-4">
          <Alert variant="default" className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Awaiting Your Approval</AlertTitle>
            <AlertDescription className="text-orange-700">
              {order.submittedBy ? (
                <>
                  Submitted by {order.submittedBy.name} on{' '}
                  {new Date(order.submittedBy.date).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </>
              ) : (
                'This purchase order requires your approval before it can be sent.'
              )}
            </AlertDescription>
          </Alert>

          {order.submitterNote && (
            <div className="bg-muted/50 rounded-md border p-3">
              <p className="text-muted-foreground text-xs font-medium uppercase">
                Submitter&apos;s Note
              </p>
              <p className="mt-1 text-sm">{order.submitterNote}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => setApproveDialogOpen(true)}
              disabled={!canApprove || isProcessing}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Order
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground flex-1"
              onClick={() => setRejectDialogOpen(true)}
              disabled={!canApprove || isProcessing}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject Order
            </Button>
          </div>
        </div>

        <ApprovalConfirmDialog
          open={approveDialogOpen}
          onOpenChange={setApproveDialogOpen}
          action="approve"
          order={order}
          onConfirm={async (data) => {
            await onApprove(data.comment);
            setApproveDialogOpen(false);
          }}
          isProcessing={isProcessing}
        />

        <ApprovalConfirmDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          action="reject"
          order={order}
          onConfirm={async (data) => {
            await onReject(data.reason!, data.comment!);
            setRejectDialogOpen(false);
          }}
          isProcessing={isProcessing}
        />
      </>
    );
  }

  // Approved status - show ready to send
  if (order.status === 'approved') {
    return (
      <div className="space-y-4">
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Order Approved</AlertTitle>
          <AlertDescription className="text-green-700">
            This order has been approved and is ready to send to the supplier.
          </AlertDescription>
        </Alert>

        {onMarkAsOrdered && (
          <Button size="lg" className="w-full" onClick={onMarkAsOrdered} disabled={isProcessing}>
            <Send className="mr-2 h-4 w-4" />
            Mark as Ordered
          </Button>
        )}
      </div>
    );
  }

  // Other statuses - no approval actions
  return null;
}

export type { ApprovalActionBarProps };
