'use client';

import { Badge } from '@/components/ui/badge';
import type { RmaExecutionStatus, RmaResponse } from '@/lib/schemas/support/rma';

import {
  getRmaExecutionContextSummary,
  getRmaExecutionStatusLabel,
} from './rma-options';
import { RmaResolutionBadge } from './rma-status-badge';

export interface RmaListRemedyCellProps {
  rma: RmaResponse;
}

export function RmaListRemedyCell({ rma }: RmaListRemedyCellProps) {
  return (
    <div className="flex flex-col gap-1">
      {rma.resolution ? (
        <RmaResolutionBadge resolution={rma.resolution} />
      ) : (
        <span className="text-muted-foreground text-sm">Not selected</span>
      )}
      <RmaExecutionBadge status={rma.executionStatus} />
    </div>
  );
}

export interface RmaListContextCellProps {
  rma: RmaResponse;
}

export function RmaListContextCell({ rma }: RmaListContextCellProps) {
  const summary = getRmaExecutionContextSummary(rma.execution, rma.issueId);

  return (
    <div className="space-y-1 text-sm">
      <div className="font-medium">{summary.title}</div>
      {summary.detail ? (
        <div className="text-muted-foreground line-clamp-2">{summary.detail}</div>
      ) : null}
      <div className="text-muted-foreground">
        {rma.orderId ? `Order ${rma.orderId.slice(0, 8)}` : 'No order'}
        {rma.linkedIssueOpen !== null && rma.linkedIssueOpen !== undefined
          ? ` · Issue ${rma.linkedIssueOpen ? 'open' : 'closed'}`
          : ''}
      </div>
    </div>
  );
}

export interface RmaExecutionBadgeProps {
  status: RmaExecutionStatus;
}

export function RmaExecutionBadge({ status }: RmaExecutionBadgeProps) {
  const variant = status === 'completed' ? 'default' : 'outline';

  return <Badge variant={variant}>{getRmaExecutionStatusLabel(status)}</Badge>;
}
