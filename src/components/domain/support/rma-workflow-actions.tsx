/**
 * RMA Workflow Actions Component
 *
 * Provides workflow action buttons based on current RMA status.
 * Uses AlertDialog for confirmations as per mobile-ui-patterns.
 *
 * @see src/hooks/use-rma.ts for mutations
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { RmaResponse, RmaResolution } from '@/lib/schemas/support/rma';
import { CheckCircle, XCircle, Package, PackageCheck, Loader2 } from 'lucide-react';

interface RmaWorkflowActionsProps {
  rma: RmaResponse;
  onSuccess?: () => void;
  className?: string;
  /** From route container (approve mutation). */
  onApprove: (payload: { rmaId: string; notes: string | null }) => Promise<void>;
  /** From route container (reject mutation). */
  onReject: (payload: { rmaId: string; rejectionReason: string }) => Promise<void>;
  /** From route container (receive mutation). */
  onReceive: (payload: {
    rmaId: string;
    inspectionNotes: {
      condition: 'good' | 'damaged' | 'defective' | 'missing_parts';
      notes?: string;
      inspectedAt: string;
    };
  }) => Promise<void>;
  /** From route container (process mutation). */
  onProcess: (payload: {
    rmaId: string;
    resolution: RmaResolution;
    resolutionDetails: { refundAmount?: number; notes?: string; resolvedAt: string };
  }) => Promise<void>;
  /** From route container (mutation state). */
  pendingAction?: 'approve' | 'reject' | 'receive' | 'process' | null;
}

// Resolution options for process dialog
const RESOLUTION_OPTIONS: { value: RmaResolution; label: string }[] = [
  { value: 'refund', label: 'Refund' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'repair', label: 'Repair' },
  { value: 'credit', label: 'Store Credit' },
  { value: 'no_action', label: 'No Action Required' },
];

// Inspection condition options
const CONDITION_OPTIONS = [
  { value: 'good', label: 'Good Condition' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'defective', label: 'Defective' },
  { value: 'missing_parts', label: 'Missing Parts' },
];

export function RmaWorkflowActions({
  rma,
  onSuccess,
  className,
  onApprove,
  onReject,
  onReceive,
  onProcess,
  pendingAction,
}: RmaWorkflowActionsProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);

  const [rejectReason, setRejectReason] = useState('');
  const [inspectionCondition, setInspectionCondition] = useState('good');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [resolution, setResolution] = useState<RmaResolution>('refund');
  const [refundAmount, setRefundAmount] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const isLoading = !!pendingAction;

  // Handle approve
  const handleApprove = async () => {
    try {
      await onApprove({
        rmaId: rma.id,
        notes: null,
      });
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve RMA');
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }
    try {
      await onReject({
        rmaId: rma.id,
        rejectionReason: rejectReason,
      });
      setRejectDialogOpen(false);
      setRejectReason('');
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject RMA');
    }
  };

  // Handle receive
  const handleReceive = async () => {
    try {
      await onReceive({
        rmaId: rma.id,
        inspectionNotes: {
          condition: inspectionCondition as 'good' | 'damaged' | 'defective' | 'missing_parts',
          notes: inspectionNotes || undefined,
          inspectedAt: new Date().toISOString(),
        },
      });
      setReceiveDialogOpen(false);
      setInspectionCondition('good');
      setInspectionNotes('');
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark received');
    }
  };

  // Handle process
  const handleProcess = async () => {
    // Validate refund amount if resolution is refund
    if (resolution === 'refund' && refundAmount) {
      const parsed = parseFloat(refundAmount);
      if (isNaN(parsed) || parsed <= 0) {
        toast.error('Please enter a valid refund amount greater than 0');
        return;
      }
    }

    try {
      await onProcess({
        rmaId: rma.id,
        resolution,
        resolutionDetails: {
          refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
          notes: resolutionNotes || undefined,
          resolvedAt: new Date().toISOString(),
        },
      });
      setProcessDialogOpen(false);
      setResolution('refund');
      setRefundAmount('');
      setResolutionNotes('');
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process RMA');
    }
  };

  // Determine available actions based on status
  const showApprove = rma.status === 'requested';
  const showReject = rma.status === 'requested';
  const showReceive = rma.status === 'approved';
  const showProcess = rma.status === 'received';

  if (!showApprove && !showReject && !showReceive && !showProcess) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {/* Approve button */}
        {showApprove && (
          <Button variant="default" size="sm" onClick={handleApprove} disabled={isLoading}>
            {pendingAction === 'approve' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Approve
          </Button>
        )}

        {/* Reject button */}
        {showReject && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setRejectDialogOpen(true)}
            disabled={isLoading}
          >
            {pendingAction === 'reject' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Reject
          </Button>
        )}

        {/* Receive button */}
        {showReceive && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setReceiveDialogOpen(true)}
            disabled={isLoading}
          >
            {pendingAction === 'receive' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Package className="mr-2 h-4 w-4" />
            )}
            Mark Received
          </Button>
        )}

        {/* Process button */}
        {showProcess && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setProcessDialogOpen(true)}
            disabled={isLoading}
          >
            {pendingAction === 'process' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PackageCheck className="mr-2 h-4 w-4" />
            )}
            Process
          </Button>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject RMA</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this RMA request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectReason">Rejection Reason</Label>
            <Textarea
              id="rejectReason"
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
              required
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={pendingAction === 'reject'}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={pendingAction === 'reject' || !rejectReason.trim()}
            >
              {pendingAction === 'reject' ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive dialog with inspection */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Items</DialogTitle>
            <DialogDescription>Log the receipt and inspection of returned items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="condition">Item Condition</Label>
              <Select value={inspectionCondition} onValueChange={setInspectionCondition}>
                <SelectTrigger id="condition">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspectionNotes">Inspection Notes (optional)</Label>
              <Textarea
                id="inspectionNotes"
                placeholder="Note any observations about the returned items..."
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReceiveDialogOpen(false)}
              disabled={pendingAction === 'receive'}
            >
              Cancel
            </Button>
            <Button onClick={handleReceive} disabled={pendingAction === 'receive'}>
              {pendingAction === 'receive' ? 'Processing...' : 'Mark Received'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process dialog with resolution */}
      <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process RMA</DialogTitle>
            <DialogDescription>Select the resolution for this RMA.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution</Label>
              <Select value={resolution} onValueChange={(v) => setResolution(v as RmaResolution)}>
                <SelectTrigger id="resolution">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {resolution === 'refund' && (
              <div className="space-y-2">
                <Label htmlFor="refundAmount">Refund Amount</Label>
                <Input
                  id="refundAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="resolutionNotes">Notes (optional)</Label>
              <Textarea
                id="resolutionNotes"
                placeholder="Add any resolution notes..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProcessDialogOpen(false)}
              disabled={pendingAction === 'process'}
            >
              Cancel
            </Button>
            <Button onClick={handleProcess} disabled={pendingAction === 'process'}>
              {pendingAction === 'process' ? 'Processing...' : 'Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
