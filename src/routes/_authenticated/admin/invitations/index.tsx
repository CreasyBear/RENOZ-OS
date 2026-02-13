/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Admin Invitations Management Route
 *
 * Route: /admin/invitations
 * Permissions: Requires admin or manager role
 * Features:
 * - View all invitations with filtering
 * - Send new invitations
 * - Resend or cancel pending invitations
 * - Track invitation status (pending/accepted/expired/cancelled)
 */

import { lazy, Suspense } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/route-guards';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const InvitationsPageContainer = lazy(() => import('./invitations-page-container'));

// ============================================================================
// SEARCH PARAMS SCHEMA
// ============================================================================

export const invitationSearchSchema = z.object({
  page: z.number().catch(1),
  pageSize: z.number().catch(20),
  status: z.union([z.literal('pending'), z.literal('accepted'), z.literal('expired'), z.literal('cancelled'), z.literal('all')]).catch('all'),
});

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/admin/invitations/')({
  beforeLoad: requireAdmin,
  validateSearch: invitationSearchSchema,
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <AdminTableSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <InvitationsPageContainer />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <AdminTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
