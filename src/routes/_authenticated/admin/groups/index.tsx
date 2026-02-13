/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Team Groups Administration Index Route
 *
 * Displays all user groups in a card grid with member counts and management actions.
 * Supports creating, editing, and deleting groups.
 *
 * @see src/hooks/users/use-groups.ts for data hooks
 */

import { lazy, Suspense } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/route-guards';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminCardGridSkeleton } from '@/components/skeletons/admin';

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const GroupsPageContainer = lazy(() => import('./groups-page-container'));

// ============================================================================
// SEARCH PARAMS SCHEMA
// ============================================================================

export const groupSearchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(24),
  includeInactive: z.coerce.boolean().default(false),
});

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/admin/groups/')({
  beforeLoad: requireAdmin,
  validateSearch: groupSearchSchema,
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <AdminCardGridSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <GroupsPageContainer />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <AdminCardGridSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
