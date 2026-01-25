/**
 * Jobs Domain Components
 *
 * Components for job/project management including task management,
 * time tracking, and commissioning checklists.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json
 */

// --- Core Components ---
export { JobsFilters, type JobsFiltersProps, type JobsFiltersState } from './jobs-filters';
export { JobsErrorBoundary } from './jobs-error-boundary';
export { JobsFilterBar } from './jobs-filter-bar';
export {
  UnifiedJobsProvider,
  useUnifiedJobs,
  useUnifiedJobData,
  useCrossViewJobSync,
  useJobViewPerformance,
} from './jobs-unified-context';
export type {
  JobViewType,
  UnifiedJobFilters,
  UnifiedJobViewState,
  UnifiedJobAction,
} from './jobs-unified-context';
export { JobsViewProvider, useJobsView, useJobsViewSync } from './jobs-view-context';
export type { JobsViewType, JobsViewFilters, JobsViewState } from './jobs-view-context';
export { JobDocumentsTab } from './job-documents-tab';

// --- Kanban ---
export * from './kanban';
export { useJobsCardInlineEdit } from './kanban/jobs-card-inline-edit';

// --- Tasks ---
export * from './tasks';
export { TaskCardSkeleton } from './tasks/task-list-skeleton';

// --- Materials ---
export * from './materials';
export { MaterialRowSkeleton, MaterialCardSkeleton } from './materials/materials-table-skeleton';
export type { Product as MaterialProduct } from './materials/add-material-dialog';

// --- Time Tracking ---
export * from './time';

// --- Templates & Checklists ---
export * from './templates';

// --- Bulk Operations ---
export * from './bulk';

// --- Calendar (existing subdirectory) ---
export * from './calendar';

// --- Timeline (existing subdirectory) ---
export * from './timeline';

// Type re-exports
export type { TaskCardProps } from './tasks/task-card';
export type { TaskFormDialogProps } from './tasks/task-form-dialog';
export type { SortableTaskListProps } from './tasks/sortable-task-list';
export type { JobTasksTabProps } from './tasks/job-tasks-tab';
export type { JobsBoardProps } from './kanban/jobs-board';
export type { JobsColumnProps } from './kanban/jobs-column';
export type { JobsCardProps } from './kanban/jobs-card';
export type { JobsCardInlineEditProps } from './kanban/jobs-card-inline-edit';
export type { JobsCardContextMenuProps } from './kanban/jobs-card-context-menu';
export type { JobsBulkActionsProps } from './bulk/jobs-bulk-actions';
export type { JobsTaskCreateDialogProps } from './tasks/jobs-task-create-dialog';
export type { JobsBulkCreateDialogProps } from './bulk/jobs-bulk-create-dialog';
export type { MaterialCardProps } from './materials/material-card';
export type { AddMaterialDialogProps } from './materials/add-material-dialog';
export type { JobMaterialsTabProps } from './materials/job-materials-tab';
export type { ActiveTimerProps } from './time/active-timer';
export type { TimeEntryDialogProps } from './time/time-entry-dialog';
export type { JobTimeTabProps } from './time/job-time-tab';
export type { ChecklistItemCardProps } from './templates/checklist-item-card';
export type { ApplyChecklistDialogProps } from './templates/apply-checklist-dialog';
export type { JobChecklistTabProps } from './templates/job-checklist-tab';
