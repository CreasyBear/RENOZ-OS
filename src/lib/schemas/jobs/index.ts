/**
 * Job Schemas
 * SPRINT-03: Added projects and site-visits schemas for new domain model
 */
export * from './job-batch';
export * from './projects';
export * from './schedule-search';
export * from './site-visits';
export * from './job-assignments';
export * from './job-calendar';
export * from './job-costing';
export * from './job-materials';
export * from './job-tasks';
export * from './job-tasks-kanban';
export * from './job-templates';
export * from './job-time';
export * from './job-timeline';
export * from './job-validation';
export * from './checklists';
export * from './installers';
export * from './workstreams-notes';
export * from './project-bom';
// project-detail exports SiteAddress/ProjectScope which conflict with projects.ts
// Import directly from '@/lib/schemas/jobs/project-detail' for detail-specific types
export {
  projectTeamMemberSchema,
  type ProjectTeamMember,
  type ProjectMember,
  keyFeaturesSchema,
  type KeyFeatures,
  customerSummarySchema,
  type CustomerSummary,
  projectDetailDataSchema,
  type ProjectDetailData,
  type ProjectTabData,
  type ProjectTabVisit,
  toProjectTabVisit,
  type ProjectTimelineTask,
  transformProjectForTabs,
  type ProjectEditFormInput,
  toProjectEditFormInput,
  type ScheduleStatus,
  type BudgetStatus,
  transformToProjectDetailData,
} from './project-detail';
// project-alerts exports AlertSeverity which conflicts with customers barrel
// Import directly from '@/lib/schemas/jobs/project-alerts' for alert types
export {
  projectAlertTypeSchema,
  type ProjectAlertType,
  projectAlertSchema,
  type ProjectAlert,
  projectAlertsResponseSchema,
  type ProjectAlertsResponse,
  getProjectAlertsInputSchema,
  type GetProjectAlertsInput,
  ALERT_SEVERITY_ORDER,
  ALERT_TYPE_SEVERITY,
  ALERT_MESSAGES,
} from './project-alerts';
