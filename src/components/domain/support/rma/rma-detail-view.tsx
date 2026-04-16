/**
 * RMA Detail View
 *
 * Presentational component for RMA detail with EntityHeader.
 * Follows 5-Zone Detail View pattern per DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

'use client';

import { Link } from '@tanstack/react-router';
import { XCircle } from 'lucide-react';
import { EntityHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RmaDetailCard } from './rma-detail-card';
import { RmaWorkflowActions } from './rma-workflow-actions';
import { getRmaStatusConfigForEntityHeader } from './rma-status-badge';
import type { ProcessRmaPayload, RmaResponse } from '@/lib/schemas/support/rma';

// ============================================================================
// TYPES
// ============================================================================

export interface RmaDetailViewProps {
  rma: RmaResponse | null | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  /** Called when any workflow action succeeds (for refetch) */
  onSuccess?: () => void;
  isPending?: boolean;
  onApprove: (notes?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onReceive: (inspection?: { condition?: string; notes?: string; locationId?: string }) => Promise<void>;
  onProcess: (input: ProcessRmaPayload) => Promise<void>;
  onCancel: () => Promise<void>;
  isCancelPending?: boolean;
}

// ============================================================================
// VIEW
// ============================================================================

export function RmaDetailView({
  rma,
  isLoading,
  error,
  onRetry,
  onSuccess,
  isPending = false,
  onApprove,
  onReject,
  onReceive,
  onProcess,
  onCancel,
  isCancelPending = false,
}: RmaDetailViewProps) {
  const secondaryActions =
    rma && (rma.status === 'requested' || rma.status === 'approved')
      ? [
          {
            label: 'Cancel RMA',
            onClick: onCancel,
            icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
            disabled: isCancelPending,
            destructive: true as const,
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      {/* Zone 1: Header — EntityHeader for consistency with issue/warranty */}
      {rma && (
        <EntityHeader
          name={rma.rmaNumber}
          subtitle={`${rma.reason.replace(/_/g, ' ')} · ${rma.lineItems?.length ?? 0} item(s)`}
          avatarFallback="R"
          status={getRmaStatusConfigForEntityHeader(rma.status)}
          secondaryActions={secondaryActions}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RmaDetailCard
            rma={rma}
            isLoading={isLoading}
            error={error}
            onRetry={onRetry}
            hideHeader={!!rma}
            workflowActions={
              rma && (
                <RmaWorkflowActions
                  rma={rma}
                  onSuccess={onSuccess}
                  onApprove={onApprove}
                  onReject={onReject}
                  onReceive={onReceive}
                  onProcess={onProcess}
                  isPending={isPending}
                />
              )
            }
          />
        </div>

        <div className="space-y-4">
          {rma?.issueId && (
            <LinkedRecordCard
              title="Related Issue"
              description={
                rma.execution?.linkedIssueOpen !== null && rma.execution?.linkedIssueOpen !== undefined
                  ? `Issue is ${rma.execution.linkedIssueOpen ? 'still open' : 'already closed'}.`
                  : null
              }
            >
              <Link
                to="/support/issues/$issueId"
                params={{ issueId: rma.issueId }}
                className="text-primary text-sm hover:underline"
              >
                View Issue
              </Link>
            </LinkedRecordCard>
          )}
          {rma?.orderId && (
            <LinkedRecordCard title="Related Order">
              <Link
                to="/orders/$orderId"
                params={{ orderId: rma.orderId }}
                className="text-primary text-sm hover:underline"
              >
                View Order
              </Link>
            </LinkedRecordCard>
          )}
          {rma?.execution?.creditNote && (
            <LinkedRecordCard title="Credit Note">
              <Link
                to="/financial/credit-notes/$creditNoteId"
                params={{ creditNoteId: rma.execution.creditNote.id }}
                className="text-primary text-sm hover:underline"
              >
                {rma.execution.creditNote.label ?? 'View Credit Note'}
              </Link>
            </LinkedRecordCard>
          )}
          {rma?.execution?.replacementOrder && (
            <LinkedRecordCard title="Replacement Order">
              <Link
                to="/orders/$orderId"
                params={{ orderId: rma.execution.replacementOrder.id }}
                className="text-primary text-sm hover:underline"
              >
                {rma.execution.replacementOrder.label ?? 'View Replacement Order'}
              </Link>
            </LinkedRecordCard>
          )}
          {rma?.execution?.refundPayment && rma.orderId && (
            <LinkedRecordCard
              title="Refund Payment"
              description={rma.execution.refundPayment.id}
              descriptionClassName="font-mono"
            >
              <Link
                to="/orders/$orderId"
                params={{ orderId: rma.orderId }}
                className="text-primary text-sm hover:underline"
              >
                View on Order
              </Link>
            </LinkedRecordCard>
          )}
        </div>
      </div>
    </div>
  );
}

interface LinkedRecordCardProps {
  title: string;
  description?: string | null;
  descriptionClassName?: string;
  children: React.ReactNode;
}

function LinkedRecordCard({
  title,
  description,
  descriptionClassName,
  children,
}: LinkedRecordCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {description ? (
          <p className={['text-muted-foreground text-sm', descriptionClassName].filter(Boolean).join(' ')}>
            {description}
          </p>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
