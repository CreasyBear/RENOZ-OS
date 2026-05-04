'use client';

import { format } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { Link2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCurrency } from '@/lib/pricing-utils';
import type { RmaResponse } from '@/lib/schemas/support/rma';

import { RmaResolutionBadge } from './rma-status-badge';
import {
  getRmaExecutionStatusLabel,
  RMA_RESOLUTION_LABELS,
} from './rma-options';

export interface RmaExecutionSummaryProps {
  rma: RmaResponse;
}

export function RmaExecutionSummary({ rma }: RmaExecutionSummaryProps) {
  const { formatPrice } = useCurrency();
  const hasExecutionContent = Boolean(rma.resolution || rma.execution);
  const hasLinkedRecords = Boolean(
    rma.execution?.refundPayment ||
      rma.execution?.creditNote ||
      rma.execution?.replacementOrder
  );

  if (!hasExecutionContent && !hasLinkedRecords) return null;

  return (
    <>
      {hasExecutionContent && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Remedy Execution</h4>
            <div className="flex flex-wrap gap-2">
              {rma.resolution ? <RmaResolutionBadge resolution={rma.resolution} /> : null}
              {rma.execution ? (
                <Badge variant={rma.execution.status === 'completed' ? 'default' : 'outline'}>
                  {getRmaExecutionStatusLabel(rma.execution.status)}
                </Badge>
              ) : null}
            </div>

            {rma.resolution ? (
              <p className="text-sm">
                <span className="text-muted-foreground">Selected remedy: </span>
                <span className="font-medium">{RMA_RESOLUTION_LABELS[rma.resolution]}</span>
              </p>
            ) : null}

            {rma.execution?.blockedReason ? (
              <p className="text-sm text-destructive">{rma.execution.blockedReason}</p>
            ) : null}

            {rma.resolutionDetails?.refundAmount !== undefined && (
              <p className="text-sm">
                <span className="text-muted-foreground">Refund Amount: </span>
                <span className="font-medium">
                  {formatPrice(rma.resolutionDetails.refundAmount)}
                </span>
              </p>
            )}

            {rma.execution?.completedAt ? (
              <p className="text-sm">
                <span className="text-muted-foreground">Completed: </span>
                <span className="font-medium">
                  {format(new Date(rma.execution.completedAt), 'PPp')}
                </span>
              </p>
            ) : null}

            {rma.resolutionDetails?.notes && (
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {rma.resolutionDetails.notes}
              </p>
            )}
          </div>
        </>
      )}

      {hasLinkedRecords && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4" />
              Linked Records
            </h4>
            <div className="space-y-2 text-sm">
              {rma.execution?.refundPayment ? (
                <p>
                  <span className="text-muted-foreground">Refund payment: </span>
                  <span className="font-mono">{rma.execution.refundPayment.id}</span>
                </p>
              ) : null}
              {rma.execution?.creditNote ? (
                <p>
                  <span className="text-muted-foreground">Credit note: </span>
                  <Link
                    to="/financial/credit-notes/$creditNoteId"
                    params={{ creditNoteId: rma.execution.creditNote.id }}
                    className="text-primary hover:underline"
                  >
                    {rma.execution.creditNote.label ?? rma.execution.creditNote.id}
                  </Link>
                </p>
              ) : null}
              {rma.execution?.replacementOrder ? (
                <p>
                  <span className="text-muted-foreground">Replacement order: </span>
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: rma.execution.replacementOrder.id }}
                    className="text-primary hover:underline"
                  >
                    {rma.execution.replacementOrder.label ?? rma.execution.replacementOrder.id}
                  </Link>
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </>
  );
}
