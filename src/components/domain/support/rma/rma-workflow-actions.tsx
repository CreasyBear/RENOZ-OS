/**
 * RMA Workflow Actions Component
 *
 * Provides workflow action buttons based on current RMA status.
 * Uses useConfirmation for approve/reject; custom dialogs for receive/process (forms).
 *
 * @see src/hooks/use-rma.ts for mutations
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 */

'use client';

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useConfirmation, confirmations } from '@/hooks/_shared/use-confirmation';
import { useHasPermission } from '@/hooks';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
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
import { toastError } from '@/hooks';
import type { RmaResponse, RmaResolution } from '@/lib/schemas/support/rma';
import { CheckCircle, XCircle, Package, PackageCheck, Loader2 } from 'lucide-react';

interface RmaWorkflowActionsProps {
  rma: RmaResponse;
  onSuccess?: () => void;
  className?: string;
  /** From route container (approve mutation). */
  onApprove: (notes?: string) => Promise<void>;
  /** From route container (reject mutation). */
  onReject: (reason: string) => Promise<void>;
  /** From route container (receive mutation). */
  onReceive: (inspectionNotes?: { condition?: string; notes?: string }) => Promise<void>;
  /** From route container (process mutation). */
  onProcess: (resolution: RmaResolution, details?: { refundAmount?: number; notes?: string }) => Promise<void>;
  /** From route container (mutation state). */
  isPending?: boolean;
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
  isPending = false,
}: RmaWorkflowActionsProps) {
  const { confirm } = useConfirmation();
  const canReceive = useHasPermission(PERMISSIONS.inventory.receive);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);

  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const handleReceiveDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, setReceiveDialogOpen);
  const handleProcessDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, setProcessDialogOpen);

  const [inspectionCondition, setInspectionCondition] = useState('good');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [resolution, setResolution] = useState<RmaResolution>('refund');
  const [refundAmount, setRefundAmount] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Handle approve (useConfirmation)
  const handleApprove = async () => {
    const { confirmed } = await confirm(confirmations.approve(rma.rmaNumber));
    if (!confirmed) return;
    try {
      await onApprove();
      onSuccess?.();
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to approve RMA');
    }
  };

  // Handle reject (useConfirmation with required reason)
  const handleReject = async () => {
    const { confirmed, reason } = await confirm(confirmations.reject(rma.rmaNumber));
    if (!confirmed || !reason?.trim()) return;
    try {
      await onReject(reason.trim());
      onSuccess?.();
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to reject RMA');
    }
  };

  // Handle receive
  const handleReceive = async () => {
    try {
      await onReceive({
        condition: inspectionCondition,
        notes: inspectionNotes || undefined,
      });
      setReceiveDialogOpen(false);
      setInspectionCondition('good');
      setInspectionNotes('');
      onSuccess?.();
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to mark received');
    }
  };

  // Handle process
  const handleProcess = async () => {
    // Validate refund amount if resolution is refund
    if (resolution === 'refund' && refundAmount) {
      const parsed = parseFloat(refundAmount);
      if (isNaN(parsed) || parsed <= 0) {
        toastError('Please enter a valid refund amount greater than 0');
        return;
      }
    }

    try {
      await onProcess(resolution, {
        refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
        notes: resolutionNotes || undefined,
      });
      setProcessDialogOpen(false);
      setResolution('refund');
      setRefundAmount('');
      setResolutionNotes('');
      onSuccess?.();
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to process RMA');
    }
  };

  // Determine available actions based on status and permissions
  const showApprove = rma.status === 'requested';
  const showReject = rma.status === 'requested';
  const showReceive = rma.status === 'approved' && canReceive;
  const showProcess = rma.status === 'received';

  if (!showApprove && !showReject && !showReceive && !showProcess) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {/* Approve button */}
        {showApprove && (
          <Button variant="default" size="sm" onClick={handleApprove} disabled={isPending}>
            {isPending ? (
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
            onClick={handleReject}
            disabled={isPending}
          >
            {isPending ? (
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
            disabled={isPending}
          >
            {isPending ? (
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
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PackageCheck className="mr-2 h-4 w-4" />
            )}
            Process
          </Button>
        )}
      </div>

      {/* Receive dialog with inspection */}
      <Dialog open={receiveDialogOpen} onOpenChange={handleReceiveDialogOpenChange}>
        <DialogContent
          onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
          onInteractOutside={pendingInteractionGuards.onInteractOutside}
        >
          <DialogHeader>
            <DialogTitle>Receive Items</DialogTitle>
            <DialogDescription>Log the receipt and inspection of returned items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {rma.lineItems && rma.lineItems.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Items to receive</Label>
                <ul className="rounded-md border p-3 text-sm">
                  {rma.lineItems.map((item) => (
                    <li key={item.id} className="flex justify-between py-1">
                      <span>{item.orderLineItem?.productName ?? 'Unknown Product'}</span>
                      <span className="text-muted-foreground">
                        {item.quantityReturned}
                        {item.serialNumber ? (
                          <>
                            {' · S/N: '}
                            <Link
                              to="/inventory/browser"
                              search={{ view: 'serialized', serializedSearch: item.serialNumber, page: 1 }}
                              className="font-mono text-primary hover:underline"
                            >
                              {item.serialNumber}
                            </Link>
                          </>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleReceive} disabled={isPending}>
              {isPending ? 'Processing...' : 'Mark Received'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process dialog with resolution */}
      <Dialog open={processDialogOpen} onOpenChange={handleProcessDialogOpenChange}>
        <DialogContent
          onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
          onInteractOutside={pendingInteractionGuards.onInteractOutside}
        >
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
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleProcess} disabled={isPending}>
              {isPending ? 'Processing...' : 'Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
