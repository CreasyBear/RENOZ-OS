/**
 * RMA Workflow Actions Component
 *
 * Provides workflow action buttons based on current RMA status.
 * Uses useConfirmation for approve/reject and guided dialogs for receipt/remedy execution.
 *
 * @see src/hooks/use-rma.ts for mutations
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 */

'use client';

import { useState } from 'react';

import { useHasPermission, toastError } from '@/hooks';
import { useConfirmation, confirmations } from '@/hooks/_shared/use-confirmation';
import { useLocations } from '@/hooks/inventory';
import { useOrderPayments } from '@/hooks/orders/use-order-payments';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ProcessRmaPayload, RmaResponse } from '@/lib/schemas/support/rma';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Package, PackageCheck, XCircle } from 'lucide-react';

import { RmaExecuteRemedyDialog } from './rma-execute-remedy-dialog';
import { RmaReceiveDialog } from './rma-receive-dialog';

interface RmaWorkflowActionsProps {
  rma: RmaResponse;
  onSuccess?: () => void;
  className?: string;
  /** From route container (approve mutation). */
  onApprove: (notes?: string) => Promise<void>;
  /** From route container (reject mutation). */
  onReject: (reason: string) => Promise<void>;
  /** From route container (receive mutation). */
  onReceive: (inspection?: {
    condition?: string;
    notes?: string;
    locationId?: string;
  }) => Promise<void>;
  /** From route container (remedy execution mutation). */
  onProcess: (input: ProcessRmaPayload) => Promise<void>;
  /** From route container (mutation state). */
  isPending?: boolean;
}

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
  const showApprove = rma.status === 'requested';
  const showReject = rma.status === 'requested';
  const showReceive = rma.status === 'approved' && canReceive;
  const showProcess = rma.status === 'received';

  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);

  const { locations, isLoading: locationsLoading } = useLocations({ autoFetch: showReceive });
  const { data: orderPayments = [] } = useOrderPayments(rma.orderId, { enabled: showProcess });

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

  if (!showApprove && !showReject && !showReceive && !showProcess) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {showApprove ? (
          <Button variant="default" size="sm" onClick={handleApprove} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Approve
          </Button>
        ) : null}

        {showReject ? (
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
        ) : null}

        {showReceive ? (
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
        ) : null}

        {showProcess ? (
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
            Execute Remedy
          </Button>
        ) : null}
      </div>

      <RmaReceiveDialog
        open={receiveDialogOpen}
        onOpenChange={setReceiveDialogOpen}
        isPending={isPending}
        rma={rma}
        locations={locations}
        locationsLoading={locationsLoading}
        onReceive={async (inspection) => {
          await onReceive(inspection);
          onSuccess?.();
        }}
      />

      <RmaExecuteRemedyDialog
        open={processDialogOpen}
        onOpenChange={setProcessDialogOpen}
        isPending={isPending}
        rma={rma}
        orderPayments={orderPayments}
        onProcess={async (input) => {
          await onProcess(input);
          onSuccess?.();
        }}
      />
    </div>
  );
}
