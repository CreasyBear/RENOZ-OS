/**
 * Jobs Domain Components
 *
 * Components for job/project management including task management,
 * time tracking, and commissioning checklists.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json
 */

// Task Management Components (DOM-JOBS-001c)
export { TaskCard, type TaskCardProps } from './task-card';
export { TaskFormDialog, type TaskFormDialogProps } from './task-form-dialog';
export { TaskListSkeleton, TaskCardSkeleton } from './task-list-skeleton';
export { SortableTaskList, type SortableTaskListProps } from './sortable-task-list';
export { JobTasksTab, type JobTasksTabProps } from './job-tasks-tab';

// Kanban Board Components (DOM-JOBS-005c)
export { JobsBoard, type JobsBoardProps } from './jobs-board';
export { JobsColumn, type JobsColumnProps } from './jobs-column';
export { JobsCard, type JobsCardProps } from './jobs-card';

// Filter Components (DOM-JOBS-005d)
export { JobsFilters, type JobsFiltersProps, type JobsFiltersState } from './jobs-filters';

// Bulk Operations Components (DOM-JOBS-005e)
export { JobsBulkActions, type JobsBulkActionsProps } from './jobs-bulk-actions';

// Task Management Components (DOM-JOBS-005f)
export { JobsTaskCreateDialog, type JobsTaskCreateDialogProps } from './jobs-task-create-dialog';
export { JobsBulkCreateDialog, type JobsBulkCreateDialogProps } from './jobs-bulk-create-dialog';
export {
  JobsCardInlineEdit,
  type JobsCardInlineEditProps,
  useJobsCardInlineEdit,
} from './jobs-card-inline-edit';
export { JobsCardContextMenu, type JobsCardContextMenuProps } from './jobs-card-context-menu';

// Error Handling Components
export { KanbanErrorBoundary } from './kanban-error-boundary';

// Materials/BOM Management Components (DOM-JOBS-002c)
export { MaterialCard, type MaterialCardProps } from './material-card';
export {
  AddMaterialDialog,
  type AddMaterialDialogProps,
  type Product as MaterialProduct,
} from './add-material-dialog';
export {
  MaterialsTableSkeleton,
  MaterialRowSkeleton,
  MaterialCardSkeleton,
} from './materials-table-skeleton';
export { JobMaterialsTab, type JobMaterialsTabProps } from './job-materials-tab';

// Time Tracking Components (DOM-JOBS-003c)
export { ActiveTimer, type ActiveTimerProps } from './active-timer';
export { TimeEntryDialog, type TimeEntryDialogProps } from './time-entry-dialog';
export { JobTimeTab, type JobTimeTabProps } from './job-time-tab';

// Commissioning Checklist Components (DOM-JOBS-004c)
export { ChecklistItemCard, type ChecklistItemCardProps } from './checklist-item-card';
export { ApplyChecklistDialog, type ApplyChecklistDialogProps } from './apply-checklist-dialog';
export { JobChecklistTab, type JobChecklistTabProps } from './job-checklist-tab';

// Job Template Components (DOM-JOBS-007c)
export { JobTemplateList } from './job-template-list';
export { JobTemplateFormDialog } from './job-template-form-dialog';
