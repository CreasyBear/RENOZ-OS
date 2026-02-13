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
  useJobAssignmentsForKanban,
  // Alias for backward compatibility
  useBatchJobOperations as useProcessJobBatchOperations,
} from './use-jobs';

export type { UseJobsOptions, CreateJobInput, UseJobAssignmentsForKanbanOptions } from './use-jobs';

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
  // My Tasks (cross-project)
  useMyTasksKanban,
} from './use-job-tasks';

export type {
  UseJobTasksOptions,
  UseJobTaskOptions,
  KanbanTasksData,
  UseJobTasksKanbanOptions,
  UseUpdateJobTaskStatusOptions,
  KanbanTask,
  MyTaskKanban,
  UseMyTasksKanbanOptions,
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
  useRecordMaterialInstallation,
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
// JOB DOCUMENTS
// ============================================================================

export {
  useJobDocuments,
  useUploadJobDocument,
  useDeleteJobDocument,
} from './use-job-documents';

export type {
  UseJobDocumentsOptions,
  UploadJobDocumentInput,
  DeleteJobDocumentInput,
} from './use-job-documents';

// ============================================================================
// VIEW SYNCHRONIZATION
// ============================================================================

export { useJobDataMutationSync, useRealtimeJobUpdates } from './use-jobs-view-sync';

// ============================================================================
// SPRINT-03: PROJECTS & SITE VISITS (New Domain Model)
// ============================================================================

// Projects
export {
  useProjects,
  useAllProjects,
  useProjectsCursor,
  useLoadProjectOptions,
  useProject,
  useProjectsByCustomer,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useAddProjectMember,
  useRemoveProjectMember,
  useCompleteProject,
  usePrefetchProject,
} from './use-projects';

// Active Projects (for sidebar contextual display)
export { useActiveProjects } from './use-active-projects';
export type { ActiveProject } from './use-active-projects';

// Site Visits
export {
  useSiteVisits,
  useSiteVisitsByProject,
  useSiteVisitsByInstaller,
  useSchedule,
  usePastDueSiteVisits,
  useSiteVisit,
  useCreateSiteVisit,
  useUpdateSiteVisit,
  useRescheduleSiteVisit,
  useDeleteSiteVisit,
  useCancelSiteVisit,
  useCheckIn,
  useCheckOut,
  useCustomerSignOff,
  usePrefetchSiteVisit,
} from './use-site-visits';

export type { SiteVisitListResult, SiteVisitItem } from '@/lib/schemas/jobs/site-visits';

export type {
  ProjectListQuery,
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
  RemoveProjectMemberInput,
  CompleteProjectInput,
} from './use-projects';

// ============================================================================
// SPRINT-03: INSTALLER MANAGEMENT
// ============================================================================

export {
  // Queries
  useInstallers,
  useAllInstallers,
  useInstaller,
  useInstallerAvailability,
  useInstallerWorkload,
  useSuggestInstallers,
  // Profile mutations
  useCreateInstallerProfile,
  useUpdateInstallerProfile,
  useDeleteInstallerProfile,
  // Bulk mutations
  useUpdateInstallerStatusBatch,
  // Certification mutations
  useCreateCertification,
  useUpdateCertification,
  useVerifyCertification,
  useDeleteCertification,
  // Skill mutations
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
  // Territory mutations
  useCreateTerritory,
  useUpdateTerritory,
  useDeleteTerritory,
  // Blockout mutations
  useCreateBlockout,
  useUpdateBlockout,
  useDeleteBlockout,
} from './use-installers';

export type { UseInstallersOptions } from './use-installers';

// Installer output types - canonical source: @/lib/schemas/jobs/installers
export type {
  InstallerListItem,
  InstallerDetail,
  Certification,
  Skill,
  Territory,
  Blockout,
  AvailabilityResult,
  WorkloadResult,
  InstallerSuggestion,
} from '@/lib/schemas/jobs/installers';

// ============================================================================
// SPRINT-03: WORKSTREAMS, NOTES, FILES
// ============================================================================

// Workstreams
export {
  useWorkstreams,
  useWorkstream,
  useCreateWorkstream,
  useUpdateWorkstream,
  useDeleteWorkstream,
  useReorderWorkstreams,
} from './use-workstreams';

// Notes
export {
  useNotes,
  useNotesStats,
  useNote,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useCreateAudioNote,
} from './use-notes';

// Files
export {
  useFiles,
  useFilesStats,
  useFile,
  useCreateFile,
  useUpdateFile,
  useDeleteFile as useDeleteProjectFile,
} from './use-files';

export type {
  CreateWorkstreamInput,
  UpdateWorkstreamInput,
  CreateNoteInput,
  UpdateNoteInput,
  CreateFileInput,
  UpdateFileInput,
  NoteType,
  NoteStatus,
  ProjectFileType,
} from '@/lib/schemas/jobs/workstreams-notes';

// ============================================================================
// SPRINT-03: PROJECT BOM
// ============================================================================

export {
  useProjectBom,
  useCreateProjectBom,
  useAddBomItem,
  useUpdateBomItem,
  useRemoveBomItem,
  useRemoveBomItems,
  useUpdateBomItemsStatus,
  useImportBomFromCsv,
  useImportBomFromOrder,
} from './use-project-bom';

// ============================================================================
// SPRINT-03: PROJECT TASKS
// ============================================================================

export {
  useProjectTasks,
  useCreateTask as useCreateProjectTask,
  useUpdateProjectTask,
  useUpdateProjectTaskStatus,
  useDeleteProjectTask,
} from './use-project-tasks';

// ============================================================================
// PROJECT DETAIL (Composite + Separated Hooks)
// ============================================================================

// Composite hook (backward compatible)
export {
  useProjectDetail,
  type UseProjectDetailReturn,
  type ProjectDetailActions,
  type ProjectDetailData,
  type ProjectTeamMember,
} from './use-project-detail';

// Data-only hook (recommended for new code)
export {
  useProjectDetailData,
  type UseProjectDetailDataReturn,
  type ProjectDetailActions as ProjectDetailDataActions,
} from './use-project-detail-data';

// UI state hook (recommended for new code)
export {
  useProjectDetailUI,
  type ProjectDetailUIState,
  type UseProjectDetailUIOptions,
} from './use-project-detail-ui';

// ============================================================================
// PROJECT ALERTS
// ============================================================================

export {
  useProjectAlerts,
  type UseProjectAlertsOptions,
  type UseProjectAlertsReturn,
} from './use-project-alerts';

export type {
  ProjectAlert,
  ProjectAlertType,
  AlertSeverity,
} from '@/lib/schemas/jobs/project-alerts';

// ============================================================================
// RE-EXPORTED TYPES
// ============================================================================

export type { JobFilters } from '@/lib/query-keys';
export type { JobAssignmentFilters } from '@/lib/schemas/jobs/job-assignments';
export type { TaskResponse as JobTask, CreateTaskInput, UpdateTaskInput } from '@/lib/schemas';
export type { RecordMaterialInstallationInput } from '@/lib/schemas/jobs/job-materials';
