/**
 * Jobs Timeline Route
 *
 * SPRINT-03: Redirect legacy timeline view to schedule timeline.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/jobs/timeline')({
  component: () => null,
  beforeLoad: () => {
    throw redirect({ to: '/schedule/timeline' });
  },
});
