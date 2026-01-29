/**
 * Jobs Calendar Route (DEPRECATED)
 *
 * Redirects to the new schedule route.
 *
 * @deprecated Use /schedule/calendar instead
 */

import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/jobs/calendar')({
  component: () => null,
  beforeLoad: () => {
    throw redirect({ to: '/schedule/calendar' });
  },
});
