/**
 * Jobs Domain Components
 *
 * This domain contains project-related components after SPRINT-03/04 restructuring.
 * Legacy job components have been removed in SPRINT-04.
 *
 * Current Structure:
 * - ✅ Projects: src/components/domain/jobs/projects/
 * - ✅ Schedule: src/components/domain/jobs/schedule/
 * - ✅ Technician: src/components/domain/jobs/technician/
 * - ✅ Site Visits: src/components/domain/jobs/site-visits/
 * - ✅ Installers: src/components/domain/jobs/installers/
 * - 🔄 Templates: Will be migrated to projects in SPRINT-05
 * - ✅ Time Tracking: consolidated under projects/time-tracking
 *
 * SPRINT-04: Legacy cleanup complete (kanban, materials, tasks, calendar, timeline, bulk removed)
 */

// --- Active New Model (KEEP) ---
// These are properly migrated and active

// Projects - Everything now exported from projects domain
export * from './projects';

// Schedule - Cross-project scheduling (active)
export {
  ScheduleCalendarContainer,
  type ScheduleCalendarContainerProps,
  ScheduleTimelineContainer,
  ScheduleDashboard,
  ScheduleHub,
  type ScheduleVisit,
  type ScheduleDay,
} from './schedule';

// Technician - Field technician view (active)
export { TechnicianDashboard } from './technician';

// Site Visits - Project site visits (active)
// SiteVisitList, CompactSiteVisitList deprecated - use ScheduleDashboard
export { SiteVisitDetail } from './site-visits';

// Installer Management (active)
export {
  InstallerSuggestionPanel,
  InstallerAvailabilityCalendar,
  type InstallerSuggestionPanelProps,
} from './installers';

// --- LEGACY SUPPORT (To be removed in SPRINT-05) ---
// Templates are temporarily kept for settings/job-templates route.
// These will be migrated to projects in a future template-domain slice.

export { JobTemplateList } from './templates/job-template-list';
export { JobTemplateFormDialog } from './templates/job-template-form-dialog';

// ============================================================================
// SPRINT-04 STATUS: Legacy directories removed ✅
// SPRINT-05 TODO:
// - Migrate templates/ to projects (project templates)
// ============================================================================
