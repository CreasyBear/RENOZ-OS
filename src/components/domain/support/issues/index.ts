/**
 * Issue Management Components
 *
 * Components for issue tracking, kanban boards, filtering, and detail views.
 */

// Detail View (Container/Presenter pattern)
export { IssueDetailContainer } from './issue-detail-container';
export { IssueDetailView } from './issue-detail-view';

// Status & Configuration
export { ISSUE_STATUS_CONFIG } from './issue-status-config';

// Bulk Actions
export { IssueBulkActions } from './issue-bulk-actions';
export type { BulkActionEvent } from './issue-bulk-actions';

// Warnings & Alerts
export { IssueDuplicateWarning } from './issue-duplicate-warning';

// Kanban Board
export { IssueKanbanBoard } from './issue-kanban-board';
export { IssueKanbanCard } from './issue-kanban-card';
export type { IssueKanbanItem } from './issue-kanban-card';

// Filtering
export {
  IssueQuickFilters,
  getFilterDescription,
  quickFilterFromSearch,
  quickFilterToSearch,
} from './issue-quick-filters';
export { IssueActivityTimelineContainer } from './issue-activity-timeline-container';
export type { QuickFilter } from './issue-quick-filters';

// Related Issues
export { IssueRelatedIssues } from './issue-related-issues';

// Dialogs
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
