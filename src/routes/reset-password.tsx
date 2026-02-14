import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/reset-password')({
  beforeLoad: () => {
    // Legacy compatibility route for older password reset emails/bookmarks.
    throw redirect({ to: '/update-password', search: { code: undefined }, replace: true });
  },
  component: () => null,
});
