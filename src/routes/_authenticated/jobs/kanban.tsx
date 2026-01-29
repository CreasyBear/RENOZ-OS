/**
 * Jobs Kanban Route
 *
 * SPRINT-03: Redirect legacy kanban view to My Tasks.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/jobs/kanban')({
  component: () => null,
  beforeLoad: () => {
    throw redirect({ to: '/my-tasks' });
  },
});
