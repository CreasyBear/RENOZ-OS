/**
 * Schedule Timeline Route
 *
 * Cross-project timeline view showing site visits as a
 * chronological agenda across the current week.
 *
 * Search params: projectId (for project-scoped filter from "View in full schedule")
 *
 * SPRINT-03: Dedicated timeline path for schedule view.
 */
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ScheduleTimelineContainer } from '@/components/domain/jobs';
import { scheduleSearchSchema } from '@/lib/schemas/jobs/schedule-search';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/schedule/timeline')({
  validateSearch: scheduleSearchSchema,
  component: ScheduleTimelinePage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ScheduleTimelinePage() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Schedule"
        description="View and manage site visits across projects"
      />
      <PageLayout.Content>
        <ScheduleTimelineContainer />
      </PageLayout.Content>
    </PageLayout>
  );
}
