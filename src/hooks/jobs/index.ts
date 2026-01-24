/**
 * Job Hooks
 *
 * Provides hooks for job management, scheduling, costing, and progress tracking.
 */

// Core job management
export { useJobDataMutationSync, useRealtimeJobUpdates } from './use-jobs-view-sync';
export type { JobFilters } from '@/lib/query-keys';

// Job tasks and kanban
export { useJobTasks, useCreateTask, useUpdateTask, useDeleteTask } from './use-job-tasks';
export {
  useJobTasksKanban,
  useUpdateJobTaskStatus,
  useJobTaskKanbanConfig,
} from './use-job-tasks-kanban';
export { useReorderTasks, useToggleTaskStatus } from './use-job-tasks';

// Scheduling and calendar
export {
  useCalendarJobs,
  useUnscheduledJobs,
  useCalendarInstallers,
  useRescheduleJob,
  useCalendarTasksForKanban,
  useJobCalendarKanban,
  useTimelineJobs,
  useTimelineStats,
  useJobsTimeline,
} from './use-job-calendar';
export { useCalendarOAuthStatus } from './use-job-calendar-oauth';

// Costing and materials
export { useJobCost, useJobProfitability, useJobCostingReport } from './use-job-costing';
export {
  useJobMaterials,
  useJobMaterial,
  useJobMaterialCost,
  useAddJobMaterial,
  useUpdateJobMaterial,
  useRemoveJobMaterial,
  useReserveJobStock,
} from './use-job-materials';
export {
  useJobTimeEntries,
  useTimeEntry,
  useJobLaborCost,
  useStartTimer,
  useStopTimer,
  useCreateManualEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
} from './use-job-time';

// Templates and checklists
export {
  useJobTemplates,
  useJobTemplate,
  useCreateJobTemplate,
  useUpdateJobTemplate,
  useDeleteJobTemplate,
  useCreateJobFromTemplate,
  useExportCalendarData,
} from './use-job-templates';
export {
  useChecklistTemplates,
  useChecklistTemplate,
  useCreateChecklistTemplate,
  useUpdateChecklistTemplate,
  useDeleteChecklistTemplate,
  useJobChecklist,
  useChecklistItem,
  useApplyChecklistToJob,
  useUpdateChecklistItem,
} from './use-checklists';

// Batch operations
export { useProcessJobBatchOperations } from './use-job-batch-operations';

// Re-export types
export type { JobAssignmentFilters } from '@/lib/schemas/jobs/job-assignments';
export type { TaskResponse as JobTask, CreateTaskInput, UpdateTaskInput } from '@/lib/schemas';
export type { KanbanTask } from './use-job-tasks-kanban';
