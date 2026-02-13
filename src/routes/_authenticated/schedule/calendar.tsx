/**
 * Schedule Calendar Route
 *
 * Cross-project calendar view showing all site visits
 * across all projects. For dispatchers and managers.
 *
 * Search params: view (calendar|week|timeline), weekStart (YYYY-MM-DD), projectId (for project-scoped filter)
 * Enables deep linking and shareable URLs.
 *
 * SPRINT-03: Dedicated calendar path for schedule view.
 *
 * @see STANDARDS.md for route patterns
 */

import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ScheduleCalendarContainer } from '@/components/domain/jobs';
import { scheduleSearchSchema } from '@/lib/schemas/jobs/schedule-search';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/schedule/calendar')({
  validateSearch: scheduleSearchSchema,
  component: ScheduleCalendarPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ScheduleCalendarPage() {
  return <ScheduleCalendarContainer Layout={PageLayout} />;
}
