/**
 * Invite User Route (Redirect)
 *
 * Consolidated to /admin/invitations as the canonical invitation surface.
 * Redirects to avoid duplicate entry points.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';
import { requireAdmin } from '@/lib/auth/route-guards';

export const Route = createFileRoute('/_authenticated/admin/users/invite')({
  beforeLoad: async (opts) => {
    await requireAdmin({ context: opts.context });
    throw redirect({
      to: '/admin/invitations',
      search: { page: 1, pageSize: 20, status: 'all' },
      replace: true,
    });
  },
});
