/**
 * Job Hooks
 *
 * Consolidated TanStack Query hooks for job management.
 * Follows financial domain gold standard with 5 logical groupings:
 *
 * 1. use-jobs.ts - Core CRUD and batch operations
 * 2. use-job-scheduling.ts - Calendar, timeline, and OAuth sync
 * 3. use-job-tasks.ts - Task management and kanban
 * 4. use-job-resources.ts - Materials, time tracking, and costing
 * 5. use-job-templates-config.ts - Templates and checklists
 *
 * @see docs/plans/2026-01-25-refactor-technical-debt-standardization-plan.md
 */

// ============================================================================
// CORE JOB CRUD & BATCH OPERATIONS
// ============================================================================

export {
  useJobs,
  useJob,
  useCreateJob,
  useUpdateJob,
  useDeleteJob,
  useBatchJobOperations,
  // Alias for backward compatibility
  useBatchJobOperations as useProcessJobBatchOperations,
} from './use-jobs';

export type { UseJobsOptions, CreateJobInput } from './use-jobs';

// ============================================================================
// JOB SCHEDULING (Calendar, Timeline, OAuth)
// ============================================================================

export {
  // Calendar views
  useCalendarJobs,
  useUnscheduledJobs,
  useCalendarInstallers,
  // Timeline views
  useTimelineJobs,
  useTimelineStats,
  useJobsTimeline,
  // Kanban calendar
  useCalendarTasksForKanban,
  useJobCalendarKanban,
  // Mutations
  useRescheduleJob,
  // OAuth calendar sync
  useCalendarOAuthConnection,
  useAvailableCalendars,
  useSyncJobToCalendar,
  useUpdateJobCalendarEvent,
  useRemoveJobFromCalendar,
  useCalendarOAuthStatus,
  useCalendarSyncStats,
} from './use-job-scheduling';

// ============================================================================
// JOB TASKS & KANBAN
// ============================================================================

export {
  // Queries
  useJobTasks,
  useJobTask,
  // Mutations
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useReorderTasks,
  useToggleTaskStatus,
  // Kanban-specific
  useJobTasksKanban,
  useUpdateJobTaskStatus,
  useJobTaskKanbanConfig,
} from './use-job-tasks';

export type {
  UseJobTasksOptions,
  UseJobTaskOptions,
  KanbanTasksData,
  UseJobTasksKanbanOptions,
  UseUpdateJobTaskStatusOptions,
  KanbanTask,
} from './use-job-tasks';

// ============================================================================
// JOB RESOURCES (Materials, Time, Costing)
// ============================================================================

export {
  // Materials
  useJobMaterials,
  useJobMaterial,
  useJobMaterialCost,
  useAddJobMaterial,
  useUpdateJobMaterial,
  useRemoveJobMaterial,
  useReserveJobStock,
  // Time tracking
  useJobTimeEntries,
  useTimeEntry,
  useJobLaborCost,
  useStartTimer,
  useStopTimer,
  useCreateManualEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  // Costing analysis
  useJobCost,
  useJobProfitability,
  useJobCostingReport,
} from './use-job-resources';

// ============================================================================
// JOB TEMPLATES & CHECKLISTS
// ============================================================================

export {
  // Job templates
  useJobTemplates,
  useJobTemplate,
  useCreateJobTemplate,
  useUpdateJobTemplate,
  useDeleteJobTemplate,
  useCreateJobFromTemplate,
  useExportCalendarData,
  // Checklist templates
  useChecklistTemplates,
  useChecklistTemplate,
  useCreateChecklistTemplate,
  useUpdateChecklistTemplate,
  useDeleteChecklistTemplate,
  // Job checklist application
  useJobChecklist,
  useChecklistItem,
  useApplyChecklistToJob,
  useUpdateChecklistItem,
} from './use-job-templates-config';

// ============================================================================
// VIEW SYNCHRONIZATION
// ============================================================================

export { useJobDataMutationSync, useRealtimeJobUpdates } from './use-jobs-view-sync';

// ============================================================================
// RE-EXPORTED TYPES
// ============================================================================

export type { JobFilters } from '@/lib/query-keys';
export type { JobAssignmentFilters } from '@/lib/schemas/jobs/job-assignments';
export type { TaskResponse as JobTask, CreateTaskInput, UpdateTaskInput } from '@/lib/schemas';
