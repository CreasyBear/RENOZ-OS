/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Installers List Route
 *
 * Installer directory with card-based layout showing:
 * - Profile info with avatar
 * - Status and availability
 * - Skills badges
 * - Territory coverage
 * - Quick actions
 *
 * SPRINT-03: Story 020 - Installer management routes
 */

import { lazy, Suspense } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const InstallersPage = lazy(() => import('./installers-page'));

export const installerSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  search: z.string().optional().default(''),
  status: z.enum(['active', 'busy', 'away', 'suspended', 'inactive']).optional(),
});

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/installers/')({
  validateSearch: installerSearchSchema,
  component: function InstallersRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header title="Installers" description="Loading..." />
          <PageLayout.Content>
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </PageLayout.Content>
        </PageLayout>
      }>
        <InstallersPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Installers" description="Loading..." />
      <PageLayout.Content>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout.Content>
    </PageLayout>
  ),
});
