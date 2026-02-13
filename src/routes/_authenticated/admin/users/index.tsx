/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * User Administration Index Route
 *
 * Lists all users in the organization with filtering, sorting, and bulk actions.
 * Provides access to user details, role management, and bulk operations.
 *
 * @performance Route is lazy-loaded to reduce initial bundle size
 *
 * @see src/hooks/users/use-users.ts for TanStack Query hooks
 * @see src/server/functions/users/users.ts for server functions
 */
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/route-guards';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';

// Search params for filtering
export const userSearchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  search: z.string().optional(),
  role: z
    .enum(['owner', 'admin', 'manager', 'sales', 'operations', 'support', 'viewer'])
    .optional(),
  status: z.enum(['active', 'invited', 'suspended', 'deactivated']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Lazy load the heavy users admin page component
const LazyUsersAdminPageContainer = lazy(() => import('./users-page-container'));

export const Route = createFileRoute('/_authenticated/admin/users/')({
  beforeLoad: requireAdmin,
  validateSearch: userSearchSchema,
  component: () => (
    <PageLayout variant="full-width">
      <Suspense fallback={<AdminTableSkeleton />}>
        <LazyUsersAdminPageContainer />
      </Suspense>
    </PageLayout>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin" />
  ),
});
