/**
 * Schedule Route
 *
 * SPRINT-03: Calendar view is now at /schedule/calendar.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/schedule/')({
  component: () => null,
  beforeLoad: () => {
    throw redirect({ to: '/schedule/calendar' });
  },
});
