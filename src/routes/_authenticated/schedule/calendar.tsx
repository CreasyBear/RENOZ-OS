/**
 * Schedule Calendar Route
 *
 * Cross-project calendar view showing all site visits
 * across all projects. For dispatchers and managers.
 *
 * SPRINT-03: Dedicated calendar path for schedule view.
 *
 * @see STANDARDS.md for route patterns
 */

import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { ScheduleCalendarContainer } from '@/components/domain/jobs';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/schedule/calendar')({
  component: ScheduleCalendarPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ScheduleCalendarPage() {
  return <ScheduleCalendarContainer />;
}
