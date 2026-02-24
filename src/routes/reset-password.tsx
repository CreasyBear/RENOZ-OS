import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  beforeLoad: ({ search }) => {
    // Legacy compatibility route for older password reset emails/bookmarks.
    throw redirect({
      to: '/update-password',
      search: { code: search.code },
      replace: true,
    });
  },
  component: () => null,
});
