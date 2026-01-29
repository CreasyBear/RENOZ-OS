/**
 * Protected Layout Route
 *
 * Alternative protected route layout. Uses the same auth pattern as _authenticated.
 */
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import type { SupabaseClient } from '@supabase/supabase-js';

export const Route = createFileRoute('/_protected')({
  beforeLoad: async ({ location }) => {
    let supabase: SupabaseClient;
    if (typeof window === 'undefined') {
      const { getRequest } = await import('@tanstack/react-start/server');
      const { createServerSupabase } = await import('~/lib/supabase/server');
      supabase = createServerSupabase(getRequest());
    } else {
      const { supabase: browserSupabase } = await import('~/lib/supabase/client');
      supabase = browserSupabase;
    }

    // Check if user is authenticated
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }

    return { user };
  },
  component: () => <Outlet />,
});
