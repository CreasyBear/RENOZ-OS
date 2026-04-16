/**
 * RMA Options and Config
 *
 * Centralized constants for RMA filters, create dialog, and badges.
 * Kept in .ts (no JSX) to preserve Fast Refresh per STANDARDS §12.
 *
 * @see STANDARDS.md §12 - Component-only exports
 */

import type {
  LinkedIssueOpenState,
  RmaExecutionSummary,
  RmaExecutionStatus,
  RmaReason,
  RmaResolution,
  RmaResponse,
  RmaStatus,
} from '@/lib/schemas/support/rma';

/** Status filter options for RMA list (includes 'all') */
export const RMA_STATUS_OPTIONS: { value: RmaStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'received', label: 'Received' },
  { value: 'processed', label: 'Processed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** Reason filter options for RMA list (includes 'all') */
export const RMA_REASON_OPTIONS: { value: RmaReason | 'all'; label: string }[] = [
  { value: 'all', label: 'All Reasons' },
  { value: 'defective', label: 'Defective' },
  { value: 'damaged_in_shipping', label: 'Damaged in Shipping' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'not_as_described', label: 'Not as Described' },
  { value: 'performance_issue', label: 'Performance Issue' },
  { value: 'installation_failure', label: 'Installation Failure' },
  { value: 'other', label: 'Other' },
];

export const RMA_RESOLUTION_OPTIONS: { value: RmaResolution | 'all'; label: string }[] = [
  { value: 'all', label: 'All Resolutions' },
  { value: 'refund', label: 'Refund' },
  { value: 'credit', label: 'Credit Note' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'repair', label: 'Repair' },
  { value: 'no_action', label: 'No Action' },
];

export const RMA_WORKFLOW_RESOLUTION_OPTIONS: {
  value: RmaResolution;
  label: string;
}[] = RMA_RESOLUTION_OPTIONS.filter(
  (option): option is { value: RmaResolution; label: string } => option.value !== 'all'
);

export const RMA_RECEIVE_CONDITION_OPTIONS = [
  { value: 'good', label: 'Good Condition' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'defective', label: 'Defective' },
  { value: 'missing_parts', label: 'Missing Parts' },
] as const;

export const RMA_EXECUTION_STATUS_OPTIONS: {
  value: RmaExecutionStatus | 'all';
  label: string;
}[] = [
  { value: 'all', label: 'All Execution States' },
  { value: 'pending', label: 'Pending' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
];

export const RMA_LINKED_ISSUE_STATE_OPTIONS: {
  value: LinkedIssueOpenState;
  label: string;
}[] = [
  { value: 'any', label: 'Any Issue State' },
  { value: 'open', label: 'Issue Open' },
  { value: 'closed', label: 'Issue Closed' },
];

/** Reason options for create dialog (value, label, description) */
export const RMA_REASON_OPTIONS_WITH_DESCRIPTION: {
  value: RmaReason;
  label: string;
  description: string;
}[] = [
  { value: 'defective', label: 'Defective', description: "Item doesn't work properly" },
  {
    value: 'damaged_in_shipping',
    label: 'Damaged in Shipping',
    description: 'Item arrived damaged',
  },
  { value: 'wrong_item', label: 'Wrong Item', description: 'Received different item than ordered' },
  {
    value: 'not_as_described',
    label: 'Not as Described',
    description: "Item doesn't match description",
  },
  {
    value: 'performance_issue',
    label: 'Performance Issue',
    description: 'Item underperforms expectations',
  },
  {
    value: 'installation_failure',
    label: 'Installation Failure',
    description: 'Unable to install properly',
  },
  { value: 'other', label: 'Other', description: 'Other reason' },
];

/** Reason labels for badges and display */
export const REASON_LABELS: Record<RmaReason, string> = {
  defective: 'Defective',
  damaged_in_shipping: 'Damaged in Shipping',
  wrong_item: 'Wrong Item',
  not_as_described: 'Not as Described',
  performance_issue: 'Performance Issue',
  installation_failure: 'Installation Failure',
  other: 'Other',
};

export const RMA_RESOLUTION_LABELS: Record<RmaResolution, string> = {
  refund: 'Refund',
  replacement: 'Replacement',
  repair: 'Repair',
  credit: 'Credit Note',
  no_action: 'No Action',
};

export const RMA_EXECUTION_STATUS_LABELS: Record<RmaExecutionStatus, string> = {
  pending: 'Pending',
  blocked: 'Blocked',
  completed: 'Completed',
};

export function getRmaExecutionStatusLabel(status: RmaExecutionStatus): string {
  return RMA_EXECUTION_STATUS_LABELS[status];
}

export function getRmaResolutionExecutionDescription(
  resolution: RmaResolution
): string {
  if (resolution === 'refund') {
    return 'This records a real refund payment against the selected source payment.';
  }
  if (resolution === 'credit') {
    return 'This creates a real credit note and can apply it to the source order immediately.';
  }
  if (resolution === 'replacement') {
    return 'This creates a zero-priced draft replacement order linked back to this RMA.';
  }
  if (resolution === 'repair') {
    return 'This records repair as the completed remedy without creating a commercial artifact.';
  }
  return 'This records that no commercial remedy artifact is required for this RMA.';
}

export function getRmaExecutionStageLabel(
  rma: Pick<RmaResponse, 'status' | 'execution'>
): string {
  if (rma.status === 'requested' || rma.status === 'approved') return 'Awaiting Receipt';
  if (rma.execution?.status === 'blocked') return 'Execution Blocked';
  if (rma.status === 'received') return 'Ready for Remedy Execution';
  if (rma.status === 'processed' || rma.execution?.status === 'completed') {
    return 'Remedy Completed';
  }
  if (rma.status === 'rejected') return 'Rejected';
  if (rma.status === 'cancelled') return 'Cancelled';
  return 'In Progress';
}

export function getRmaExecutionContextSummary(
  execution: RmaExecutionSummary | null | undefined,
  issueId: string | null | undefined
): { title: string; detail: string | null } {
  if (execution?.replacementOrder?.label) {
    return {
      title: `Replacement ${execution.replacementOrder.label}`,
      detail: 'Draft replacement order created.',
    };
  }

  if (execution?.creditNote?.label) {
    return {
      title: `Credit ${execution.creditNote.label}`,
      detail: 'Credit note created and linked.',
    };
  }

  if (execution?.refundPayment?.id) {
    return {
      title: `Refund ${execution.refundPayment.id.slice(0, 8)}`,
      detail: 'Refund payment recorded against the source order.',
    };
  }

  if (execution?.status === 'blocked') {
    return {
      title: 'Execution blocked',
      detail: execution.blockedReason ?? 'Resolve the blocker before completing the remedy.',
    };
  }

  if (execution?.status === 'pending') {
    return {
      title: 'Awaiting remedy execution',
      detail: 'Receipt is complete, but the remedy has not been executed yet.',
    };
  }

  if (issueId) {
    return {
      title: 'Issue-linked RMA',
      detail: 'This RMA is connected to a support issue.',
    };
  }

  return {
    title: 'Standalone RMA',
    detail: 'No linked support issue.',
  };
}
