/**
 * Jobs Index Route
 *
 * SPRINT-03: Redirect legacy jobs entrypoint to projects.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/jobs/')({
  component: () => null,
  beforeLoad: () => {
    throw redirect({ to: '/projects' });
  },
});
