'use client';

import { useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toastError } from '@/hooks';
import type { Payment } from '@/lib/schemas/orders/order-payments';
import type {
  ProcessRmaPayload,
  RmaResolution,
  RmaResponse,
} from '@/lib/schemas/support/rma';

import {
  getRmaResolutionExecutionDescription,
  RMA_RESOLUTION_LABELS,
  RMA_WORKFLOW_RESOLUTION_OPTIONS,
} from './rma-options';

interface RefundablePayment extends RmaExecutionPaymentSource {
  remainingRefundable: number;
}

type RmaExecutionPaymentSource = Pick<
  Payment,
  'id' | 'amount' | 'paymentMethod' | 'isRefund' | 'relatedPaymentId'
>;

interface RmaExecuteRemedyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  rma: RmaResponse;
  orderPayments: RmaExecutionPaymentSource[];
  onProcess: (input: ProcessRmaPayload) => Promise<void>;
}

const INITIAL_EXECUTION_FORM_STATE = {
  resolution: 'refund' as RmaResolution,
  refundAmount: '',
  originalPaymentId: '',
  creditAmount: '',
  creditReason: '',
  applyNow: true,
  confirmReplacement: false,
  resolutionNotes: '',
};

function getRefundablePayments(
  orderPayments: RmaExecutionPaymentSource[]
): RefundablePayment[] {
  return orderPayments
    .filter((payment) => !payment.isRefund)
    .map((payment) => {
      const refunded = orderPayments
        .filter(
          (candidate) => candidate.isRefund && candidate.relatedPaymentId === payment.id
        )
        .reduce((sum, candidate) => sum + Number(candidate.amount), 0);
      return {
        ...payment,
        remainingRefundable: Math.max(0, Number(payment.amount) - refunded),
      };
    })
    .filter((payment) => payment.remainingRefundable > 0);
}

export function RmaExecuteRemedyDialog({
  open,
  onOpenChange,
  isPending,
  rma,
  orderPayments,
  onProcess,
}: RmaExecuteRemedyDialogProps) {
  const [resolution, setResolution] = useState(INITIAL_EXECUTION_FORM_STATE.resolution);
  const [refundAmount, setRefundAmount] = useState(INITIAL_EXECUTION_FORM_STATE.refundAmount);
  const [originalPaymentId, setOriginalPaymentId] = useState(
    INITIAL_EXECUTION_FORM_STATE.originalPaymentId
  );
  const [creditAmount, setCreditAmount] = useState(INITIAL_EXECUTION_FORM_STATE.creditAmount);
  const [creditReason, setCreditReason] = useState(INITIAL_EXECUTION_FORM_STATE.creditReason);
  const [applyNow, setApplyNow] = useState(INITIAL_EXECUTION_FORM_STATE.applyNow);
  const [confirmReplacement, setConfirmReplacement] = useState(
    INITIAL_EXECUTION_FORM_STATE.confirmReplacement
  );
  const [resolutionNotes, setResolutionNotes] = useState(
    INITIAL_EXECUTION_FORM_STATE.resolutionNotes
  );

  const refundablePayments = useMemo(
    () => getRefundablePayments(orderPayments),
    [orderPayments]
  );

  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const guardedOpenChange = createPendingDialogOpenChangeHandler(isPending, onOpenChange);

  const resetForm = () => {
    setResolution(INITIAL_EXECUTION_FORM_STATE.resolution);
    setRefundAmount(INITIAL_EXECUTION_FORM_STATE.refundAmount);
    setOriginalPaymentId(INITIAL_EXECUTION_FORM_STATE.originalPaymentId);
    setCreditAmount(INITIAL_EXECUTION_FORM_STATE.creditAmount);
    setCreditReason(INITIAL_EXECUTION_FORM_STATE.creditReason);
    setApplyNow(INITIAL_EXECUTION_FORM_STATE.applyNow);
    setConfirmReplacement(INITIAL_EXECUTION_FORM_STATE.confirmReplacement);
    setResolutionNotes(INITIAL_EXECUTION_FORM_STATE.resolutionNotes);
  };

  useEffect(() => {
    resetForm();
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    guardedOpenChange(nextOpen);
  };

  const handleProcess = async () => {
    try {
      if (resolution === 'refund') {
        const parsed = Number.parseFloat(refundAmount);
        if (!originalPaymentId) {
          toastError('Choose the source payment to refund.');
          return;
        }
        if (Number.isNaN(parsed) || parsed <= 0) {
          toastError('Please enter a valid refund amount greater than 0');
          return;
        }

        await onProcess({
          resolution,
          originalPaymentId,
          amount: parsed,
          notes: resolutionNotes || undefined,
        });
      } else if (resolution === 'credit') {
        const parsed = Number.parseFloat(creditAmount);
        if (Number.isNaN(parsed) || parsed <= 0) {
          toastError('Please enter a valid credit amount greater than 0');
          return;
        }
        if (!creditReason.trim()) {
          toastError('Add a reason for the credit note.');
          return;
        }

        await onProcess({
          resolution,
          amount: parsed,
          creditReason: creditReason.trim(),
          applyNow,
          notes: resolutionNotes || undefined,
        });
      } else if (resolution === 'replacement') {
        if (!confirmReplacement) {
          toastError('Confirm the replacement order before continuing.');
          return;
        }

        await onProcess({
          resolution,
          confirmReplacement: true,
          notes: resolutionNotes || undefined,
        });
      } else {
        await onProcess({
          resolution,
          notes: resolutionNotes || undefined,
        });
      }

      resetForm();
      onOpenChange(false);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to execute remedy');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>Execute Remedy</DialogTitle>
          <DialogDescription>
            Confirm the remedy outcome and create the linked records from this RMA.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution</Label>
            <Select value={resolution} onValueChange={(value) => setResolution(value as RmaResolution)}>
              <SelectTrigger id="resolution">
                <SelectValue placeholder="Select resolution" />
              </SelectTrigger>
              <SelectContent>
                {RMA_WORKFLOW_RESOLUTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <AlertTitle>{RMA_RESOLUTION_LABELS[resolution]}</AlertTitle>
            <AlertDescription>
              {getRmaResolutionExecutionDescription(resolution)}
            </AlertDescription>
          </Alert>

          {resolution === 'refund' ? (
            <>
              {refundablePayments.length === 0 ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    No refundable source payment is available for this order. Choose another remedy or record a payment first.
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="originalPayment">Source Payment</Label>
                <Select value={originalPaymentId} onValueChange={setOriginalPaymentId}>
                  <SelectTrigger id="originalPayment">
                    <SelectValue placeholder="Select payment to refund" />
                  </SelectTrigger>
                  <SelectContent>
                    {refundablePayments.map((payment) => (
                      <SelectItem key={payment.id} value={payment.id}>
                        {payment.paymentMethod} · ${Number(payment.amount).toFixed(2)} · remaining $
                        {payment.remainingRefundable.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="refundAmount">Refund Amount</Label>
                <Input
                  id="refundAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                />
              </div>
            </>
          ) : null}

          {resolution === 'credit' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="creditAmount">Credit Amount</Label>
                <Input
                  id="creditAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={creditAmount}
                  onChange={(event) => setCreditAmount(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditReason">Credit Note Reason</Label>
                <Textarea
                  id="creditReason"
                  placeholder="Why are we issuing this credit note?"
                  value={creditReason}
                  onChange={(event) => setCreditReason(event.target.value)}
                />
              </div>
              <div className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  id="applyNow"
                  checked={applyNow}
                  onCheckedChange={(checked) => setApplyNow(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="applyNow" className="text-sm font-medium">
                    Apply to the source order immediately
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, the issued credit note will be applied to the source order if it is eligible.
                  </p>
                </div>
              </div>
            </>
          ) : null}

          {resolution === 'replacement' ? (
            <div className="space-y-3 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Replacement draft summary</p>
                <p className="text-sm text-muted-foreground">
                  This replacement order will be created as a zero-priced draft using the returned line items on{' '}
                  {rma.rmaNumber}.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="confirmReplacement"
                  checked={confirmReplacement}
                  onCheckedChange={(checked) => setConfirmReplacement(checked === true)}
                />
                <Label htmlFor="confirmReplacement" className="text-sm font-medium">
                  Confirm draft replacement order creation
                </Label>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="resolutionNotes">Execution Notes</Label>
            <Textarea
              id="resolutionNotes"
              placeholder="Capture any operator notes about the chosen remedy..."
              value={resolutionNotes}
              onChange={(event) => setResolutionNotes(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleProcess} disabled={isPending}>
            {isPending ? 'Executing...' : 'Execute Remedy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
