/**
 * Schedule Timeline Route
 *
 * Cross-project timeline view showing site visits as a
 * chronological agenda across the current week.
 *
 * SPRINT-03: Dedicated timeline path for schedule view.
 */
import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { ScheduleTimelineContainer } from '@/components/domain/jobs';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/schedule/timeline')({
  component: ScheduleTimelinePage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ScheduleTimelinePage() {
  return <ScheduleTimelineContainer />;
}
