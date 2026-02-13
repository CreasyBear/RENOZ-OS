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
import { RmaDetailCard } from './rma-detail-card';
import { RmaWorkflowActions } from './rma-workflow-actions';
import { getRmaStatusConfigForEntityHeader } from './rma-status-badge';
import type { RmaResponse, RmaResolution } from '@/lib/schemas/support/rma';

// ============================================================================
// TYPES
// ============================================================================

export interface RmaDetailViewProps {
  rma: RmaResponse | null | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  isPending?: boolean;
  onApprove: (notes?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onReceive: (inspectionNotes?: { condition?: string; notes?: string }) => Promise<void>;
  onProcess: (resolution: RmaResolution, details?: { refundAmount?: number; notes?: string }) => Promise<void>;
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
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium">Related Issue</h3>
              <Link
                to="/support/issues/$issueId"
                params={{ issueId: rma.issueId }}
                className="text-primary text-sm hover:underline"
              >
                View Issue →
              </Link>
            </div>
          )}
          {rma?.orderId && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium">Related Order</h3>
              <Link
                to="/orders/$orderId"
                params={{ orderId: rma.orderId }}
                className="text-primary text-sm hover:underline"
              >
                View Order →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
