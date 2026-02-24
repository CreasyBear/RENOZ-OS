/**
 * RMA Options and Config
 *
 * Centralized constants for RMA filters, create dialog, and badges.
 * Kept in .ts (no JSX) to preserve Fast Refresh per STANDARDS §12.
 *
 * @see STANDARDS.md §12 - Component-only exports
 */

import type { RmaStatus, RmaReason } from '@/lib/schemas/support/rma';

/** Status filter options for RMA list (includes 'all') */
export const RMA_STATUS_OPTIONS: { value: RmaStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'received', label: 'Received' },
  { value: 'processed', label: 'Processed' },
  { value: 'rejected', label: 'Rejected' },
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
