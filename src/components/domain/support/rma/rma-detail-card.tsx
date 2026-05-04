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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Package, Calendar, User, FileText, Hash, ClipboardList } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import {
  getRmaExecutionStageLabel,
} from './rma-options';
import { RmaExecutionSummary } from './rma-execution-summary';

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

        <RmaExecutionSummary rma={rma} />

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
