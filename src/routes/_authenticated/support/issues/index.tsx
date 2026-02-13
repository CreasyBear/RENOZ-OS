/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Issue List Route
 *
 * Displays all issues with filtering, sorting, and pagination.
 *
 * LAYOUT: full-width
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 * @see _Initiation/_prd/2-domains/support/support.prd.json
 */

import { lazy, Suspense } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { SupportTableSkeleton } from '@/components/skeletons/support';

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const IssuesPage = lazy(() => import('./issues-page'));

// ============================================================================
// ROUTE SEARCH PARAMS
// ============================================================================

export const issuesSearchSchema = z.object({
  /** Comma-separated status values for multi-select presets */
  status: z.string().optional(),
  /** Comma-separated priority values for multi-select presets */
  priority: z.string().optional(),
  type: z
    .enum([
      'hardware_fault',
      'software_firmware',
      'installation_defect',
      'performance_degradation',
      'connectivity',
      'other',
    ])
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  /** slaStatus: breached (overdue) or at_risk - filters by SLA state */
  slaStatus: z.enum(['breached', 'at_risk']).optional(),
  /** escalated: true = only escalated issues */
  escalated: z.coerce.boolean().optional(),
  /** assignedToUserId: specific user UUID, or use assignedToFilter for me/unassigned */
  assignedToUserId: z.string().uuid().optional(),
  /** assignedToFilter: "me" = current user, "unassigned" = no assignee */
  assignedToFilter: z.enum(["me", "unassigned"]).optional(),
  /** quickFilter: all triage + client-side filters for URL context preservation */
  quickFilter: z
    .enum(['all', 'overdue_sla', 'escalated', 'my_issues', 'unassigned', 'sla_at_risk', 'high_priority', 'recent'])
    .optional(),
});

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/support/issues/')({
  validateSearch: issuesSearchSchema,
  component: function IssuesRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header
            title="Issues"
            description="Manage support issues and track resolution"
          />
          <PageLayout.Content>
            <SupportTableSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }>
        <IssuesPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/issues" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Issues"
        description="Manage support issues and track resolution"
      />
      <PageLayout.Content>
        <SupportTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
