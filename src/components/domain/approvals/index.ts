/**
 * Approvals Domain Components
 *
 * Barrel export for approval-related UI components.
 */

// Main dashboard components
export { ApprovalDashboard, type ApprovalDashboardProps } from './approval-dashboard';
// Re-export types from schemas (single source of truth)
export type { ApprovalItem, ApprovalFilters } from '@/lib/schemas/approvals';
export { ApprovalStatsCards, type ApprovalStatsCardsProps, type ApprovalStats } from './approval-stats-cards';
export { ApprovalTable, type ApprovalTableProps } from './approval-table';
export { ApprovalBulkActions, type ApprovalBulkActionsProps } from './approval-bulk-actions';

// Dialog components
export { ApprovalDecisionDialog } from './approval-decision-dialog';
export { BulkApprovalDialog } from './bulk-approval-dialog';

// SUPP-APPROVAL-WORKFLOW components
export { ApprovalActionBar } from './approval-action-bar';
export type { ApprovalActionBarProps } from './approval-action-bar';

export { ApprovalSubmitDialog } from './approval-submit-dialog';
export type { ApprovalSubmitDialogProps } from './approval-submit-dialog';

export { ApprovalConfirmDialog } from './approval-confirm-dialog';
export type { ApprovalConfirmDialogProps } from './approval-confirm-dialog';

export { ApprovalHistory } from './approval-history';
export type { ApprovalHistoryProps } from './approval-history';
