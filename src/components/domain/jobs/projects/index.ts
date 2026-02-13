/**
 * Projects Domain Components
 *
 * Components for project management in the SPRINT-03 domain model.
 *
 * @see _Initiation/_prd/sprints/sprint-03-jobs-domain-restructure.prd.json
 */

// --- Card Components ---
export { ProjectCard, type ProjectCardProps } from './project-card';

// --- Dialog Components ---
export { ProjectCreateDialog, type ProjectCreateDialogProps } from './project-create-dialog';
export { ProjectEditDialog, type ProjectEditDialogProps } from './project-edit-dialog';
export {
  ProjectCompletionDialog,
  type ProjectCompletionDialogProps,
} from './project-completion-dialog';
export { SiteVisitCreateDialog, type SiteVisitCreateDialogProps } from './site-visit-create-dialog';

// --- Workstream Dialogs ---
export {
  WorkstreamCreateDialog,
  WorkstreamEditDialog,
  type WorkstreamCreateDialogProps,
  type WorkstreamEditDialogProps,
} from './workstream-dialogs';

// --- Task Dialogs ---
export {
  TaskCreateDialog,
  TaskEditDialog,
  type TaskCreateDialogProps,
  type TaskEditDialogProps,
} from './task-dialogs';

// --- Task List ---
export { TaskList, type TaskListProps } from './task-list';

// --- BOM Dialogs ---
export { BomAddItemDialog, type BomAddItemDialogProps } from './bom-dialogs';

// --- Note Dialogs ---
export {
  NoteCreateDialog,
  NoteEditDialog,
  type NoteCreateDialogProps,
  type NoteEditDialogProps,
} from './note-dialogs';

// --- File Dialogs ---
export { FileUploadDialog, type FileUploadDialogProps } from './file-dialogs';

// --- List Components ---
export { ProjectListGrid, type ProjectListGridProps } from './project-list';

// --- Table View Components (migrated to shared DataTable pattern) ---
export {
  PROJECT_STATUS_CONFIG,
  PROJECT_PRIORITY_CONFIG,
  isProjectOverdue,
  formatTargetDateRelative,
  formatProjectType,
} from './project-status-config';
export {
  createProjectColumns,
  type ProjectTableItem,
  type CreateProjectColumnsOptions,
} from './project-columns';
export { ProjectsMobileCards, type ProjectsMobileCardsProps } from './projects-mobile-cards';
export { ProjectsTablePresenter, type ProjectsTablePresenterProps } from './projects-table-presenter';
export { ProjectsListPresenter, type ProjectsListPresenterProps } from './projects-list-presenter';
export {
  ProjectsListContainer,
  type ProjectsListContainerProps,
  type ProjectsListFilters,
} from './projects-list-container';

// --- Detail Components (Container/Presenter pattern) ---
export {
  ProjectDetailContainer,
  type ProjectDetailContainerProps,
  type ProjectDetailContainerRenderProps,
} from './containers/project-detail-container';

export {
  ProjectDetailView,
  type ProjectDetailViewProps,
} from './views/project-detail-view';

// Re-export types from schemas (single source of truth)
export type { ProjectDetailData, ProjectMember } from '@/lib/schemas/jobs/project-detail';

// --- Tab Components (for use with ProjectDetailView) ---
export {
  ProjectOverviewTab,
  ProjectWorkstreamsTab,
  ProjectVisitsTab,
  ProjectTasksTab,
  ProjectBomTab,
  ProjectNotesTab,
  ProjectFilesTab,
} from './project-detail-tabs';
export type { ProjectTabData } from './project-detail-tabs';

// --- Timeline & Overview Components ---
export { ProgressCircle, StatusProgressCircle } from './progress-circle';
export { ProjectLifecycleProgress } from './project-lifecycle-progress';
export { ProjectTimelineGantt } from './project-timeline-gantt';
export {
  ScopeColumns,
  OutcomesList,
  KeyFeaturesColumns,
  ProjectDescriptionCard,
} from './project-overview-panels';
export { ProjectMetaPanel } from './project-meta-panel';
export type { ProjectMetaPanelProps } from './project-meta-panel';

// --- Meta Panel Cards ---
export { TimeCard } from './time-card';
export { BacklogCard } from './backlog-card';
export { QuickLinksCard } from './quick-links-card';

// --- Enhanced BOM Tab ---
export { ProjectBomTab as ProjectBomTabEnhanced } from './project-bom-tab';

// --- Enhanced Tasks Tab ---
export { ProjectTasksTab as ProjectTasksTabEnhanced } from './project-tasks-tab';

// --- Enhanced Notes Tab ---
export { ProjectNotesTab as ProjectNotesTabEnhanced } from './project-notes-tab';

// --- Enhanced Files Tab ---
export { ProjectFilesTab as ProjectFilesTabEnhanced } from './project-files-tab';

// --- Projects Dashboard ---
export { ProjectsDashboard } from './projects-dashboard';
export {
  ProjectsTriageSection,
  type ProjectsTriageSectionProps,
} from './projects-triage-section';

// --- Checklists (Migrated from jobs/templates) ---
export {
  ChecklistItemCard,
  ApplyChecklistDialog,
  type ChecklistItemCardProps,
} from './checklists';

// --- Time Tracking (Migrated from jobs/time) ---
export {
  ActiveTimer,
  TimeEntryDialog,
  type ActiveTimerProps,
  type TimeEntryDialogProps,
} from './time-tracking';
