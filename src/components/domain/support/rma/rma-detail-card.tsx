/**
 * RMA Detail Card Component
 *
 * Displays RMA details with workflow status and actions.
 * Shows line items, timeline, and available workflow transitions.
 *
 * @see src/hooks/use-rma.ts for data and mutations
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  RmaStatusBadge,
  RmaReasonBadge,
  RmaResolutionBadge,
} from './rma-status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { DetailGrid } from '@/components/shared';
import type { RmaLineItemResponse, RmaResponse } from '@/lib/schemas/support/rma';
import { useCurrency } from '@/lib/pricing-utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Package, Calendar, User, FileText, Hash, ClipboardList, Link2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import {
  getRmaExecutionStageLabel,
  getRmaExecutionStatusLabel,
  RMA_RESOLUTION_LABELS,
} from './rma-options';

interface RmaDetailCardProps {
  /** From route container (useRma). */
  rma?: RmaResponse | null;
  /** From route container (useRma). */
  isLoading?: boolean;
  /** From route container (useRma). */
  error?: Error | null;
  /** From route container (useRma). */
  onRetry?: () => void;
  /** Show workflow actions */
  showActions?: boolean;
  /** Additional class names */
  className?: string;
  /** From route container (workflow handlers). */
  workflowActions?: React.ReactNode;
  /** Hide card header when using EntityHeader (avoids duplicate title) */
  hideHeader?: boolean;
}

export function RmaDetailCard({
  rma,
  isLoading,
  error,
  onRetry,
  showActions = true,
  className,
  workflowActions,
  hideHeader = false,
}: RmaDetailCardProps) {
  const { formatPrice } = useCurrency();

  if (isLoading) {
    return <LoadingState text="Loading RMA details..." />;
  }

  if (error || !rma) {
    return (
      <ErrorState
        title="Failed to load RMA"
        message={error?.message ?? 'RMA not found'}
        onRetry={onRetry}
      />
    );
  }

  return (
    <Card className={className}>
      {!hideHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {rma.rmaNumber}
              </CardTitle>
              <div className="mt-2 flex flex-wrap gap-2">
                <RmaStatusBadge status={rma.status} />
                <RmaReasonBadge reason={rma.reason} />
                {rma.resolution && <RmaResolutionBadge resolution={rma.resolution} />}
              </div>
            </div>
            {showActions && workflowActions}
          </div>
        </CardHeader>
      )}
      {hideHeader && showActions && workflowActions && (
        <div className="flex justify-end px-6 pt-4">{workflowActions}</div>
      )}

      <CardContent className={cn('space-y-6', hideHeader && 'pt-2')}>
        {/* Details grid */}
        <DetailGrid
          fields={[
            {
              label: 'Execution Stage',
              value: (
                <span className="inline-flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{getRmaExecutionStageLabel(rma)}</span>
                </span>
              ),
            },
            {
              label: 'Created',
              value: (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{format(new Date(rma.createdAt), 'PPp')}</span>
                </span>
              ),
            },
            {
              label: 'Approved',
              value: rma.approvedAt ? (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{format(new Date(rma.approvedAt), 'PPp')}</span>
                </span>
              ) : null,
              hidden: !rma.approvedAt,
            },
            {
              label: 'Received',
              value: rma.receivedAt ? (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{format(new Date(rma.receivedAt), 'PPp')}</span>
                </span>
              ) : null,
              hidden: !rma.receivedAt,
            },
            {
              label: 'Processed',
              value: rma.processedAt ? (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{format(new Date(rma.processedAt), 'PPp')}</span>
                </span>
              ) : null,
              hidden: !rma.processedAt,
            },
          ]}
        />

        {/* Reason details */}
        {rma.reasonDetails && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                Reason Details
              </h4>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {rma.reasonDetails}
              </p>
            </div>
          </>
        )}

        {/* Customer notes */}
        {rma.customerNotes && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              Customer Notes
            </h4>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{rma.customerNotes}</p>
          </div>
        )}

        {/* Inspection notes */}
        {rma.inspectionNotes && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <ClipboardList className="h-4 w-4" />
              Inspection Notes
            </h4>
            {rma.inspectionNotes.condition && (
              <Badge variant="outline" className="capitalize">
                {rma.inspectionNotes.condition.replace('_', ' ')}
              </Badge>
            )}
            {rma.inspectionNotes.notes && (
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {rma.inspectionNotes.notes}
              </p>
            )}
          </div>
        )}

        {/* Line items */}
        <Separator />
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-medium">
            <Hash className="h-4 w-4" />
            Return Items ({rma.lineItems?.length ?? 0})
          </h4>
          <div className="space-y-2">
            {rma.lineItems?.map((item) => (
              <LineItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Remedy execution */}
        {(rma.resolution || rma.execution) && (
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

        {(rma.execution?.refundPayment || rma.execution?.creditNote || rma.execution?.replacementOrder) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="h-4 w-4" />
                Linked Records
              </h4>
              <div className="space-y-2 text-sm">
                {rma.execution.refundPayment ? (
                  <p>
                    <span className="text-muted-foreground">Refund payment: </span>
                    <span className="font-mono">{rma.execution.refundPayment.id}</span>
                  </p>
                ) : null}
                {rma.execution.creditNote ? (
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
                {rma.execution.replacementOrder ? (
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

        {/* Internal notes (visible to staff only) */}
        {rma.internalNotes && (
          <>
            <Separator />
            <div className="space-y-2 rounded-md bg-muted/50 p-3">
              <h4 className="text-muted-foreground text-sm font-medium">Internal Notes</h4>
              <p className="text-sm whitespace-pre-wrap">{rma.internalNotes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Helper components

interface LineItemRowProps {
  item: RmaLineItemResponse;
}

function LineItemRow({ item }: LineItemRowProps) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <div className="font-medium">{item.orderLineItem?.productName ?? 'Unknown Product'}</div>
        <div className="text-muted-foreground text-sm">
          Qty: {item.quantityReturned}
          {item.serialNumber ? (
            <>
              {' • S/N: '}
              <Link
                to="/inventory/browser"
                search={{ view: 'serialized', serializedSearch: item.serialNumber, page: 1 }}
                className="font-mono text-primary hover:underline"
              >
                {item.serialNumber}
              </Link>
            </>
          ) : null}
        </div>
        {item.itemReason && (
          <div className="text-muted-foreground text-sm">Reason: {item.itemReason}</div>
        )}
      </div>
      {item.itemCondition && (
        <Badge variant="outline" className="capitalize">
          {item.itemCondition.replace('_', ' ')}
        </Badge>
      )}
    </div>
  );
}
