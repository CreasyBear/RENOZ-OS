import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_protected')({
  beforeLoad: async ({ context }) => {
    // Use user from root context (already fetched there)
    if (!context.user) {
      throw redirect({ to: '/login' });
    }

    return { user: context.user };
  },
});
