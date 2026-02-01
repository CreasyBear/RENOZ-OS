/**
 * Issue Management Components
 */
export { ISSUE_STATUS_CONFIG } from './issue-status-config';
export { IssueBulkActions } from './issue-bulk-actions';
export type { BulkActionEvent } from './issue-bulk-actions';
export { IssueDuplicateWarning } from './issue-duplicate-warning';
export { IssueKanbanBoard } from './issue-kanban-board';
export { IssueKanbanCard } from './issue-kanban-card';
export type { IssueKanbanItem } from './issue-kanban-card';
export { IssueQuickFilters, getFilterDescription } from './issue-quick-filters';
export type { QuickFilter } from './issue-quick-filters';
export { IssueRelatedIssues } from './issue-related-issues';
export { IssueStatusChangeDialog } from './issue-status-change-dialog';
export type { StatusChangeResult } from './issue-status-change-dialog';
export { IssueTemplateFormDialog } from './issue-template-form-dialog';
export { IssueTemplateList } from './issue-template-list';

// --- Filter Config (FILTER-STANDARDS compliant) ---
export {
  ISSUE_FILTER_CONFIG,
  ISSUE_STATUS_OPTIONS,
  ISSUE_PRIORITY_OPTIONS,
  DEFAULT_ISSUE_FILTERS,
  createIssueFilterConfig,
  type IssueFiltersState,
  type IssueStatus,
  type IssuePriority,
} from './issue-filter-config';
