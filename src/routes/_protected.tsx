/**
 * Protected Layout Route
 *
 * Alternative protected route layout. Uses the same auth pattern as _authenticated.
 */
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '../lib/supabase/client';

export const Route = createFileRoute('/_protected')({
  beforeLoad: async ({ location }) => {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }

    return { user: session.user };
  },
  component: () => <Outlet />,
});
