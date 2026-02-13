/**
 * Warranty Claims List Page
 *
 * Displays all warranty claims with filtering, sorting, and pagination.
 * Links to claim detail view and allows status updates.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-006c
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-006c.wireframe.md
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FileWarning } from 'lucide-react';
import { z } from 'zod';

import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportTableSkeleton } from '@/components/skeletons/support';
import { WarrantyClaimsListContainer } from '@/components/domain/warranty/containers/warranty-claims-list-container';
import type { WarrantyClaimsSearchParams } from '@/lib/schemas/warranty';

// ============================================================================
// ROUTE SEARCH PARAMS
// ============================================================================

const claimsSearchSchema = z.object({
  status: z
    .enum(['submitted', 'under_review', 'approved', 'denied', 'resolved', 'cancelled'])
    .optional(),
  type: z
    .enum(['cell_degradation', 'bms_fault', 'inverter_failure', 'installation_defect', 'other'])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  sortBy: z.enum(['submittedAt', 'claimNumber', 'status', 'claimType']).default('submittedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const Route = createFileRoute('/_authenticated/support/claims/')({
  validateSearch: claimsSearchSchema,
  component: ClaimsListPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Warranty Claims"
        description="Manage warranty claims and track resolutions"
      />
      <PageLayout.Content>
        <SupportTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function ClaimsListPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  // Update search params
  const updateSearch = (updates: Partial<WarrantyClaimsSearchParams>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
        // Reset to page 1 when filters change
        page: 'page' in updates ? updates.page : 1,
      }),
    });
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-2">
            <FileWarning className="h-6 w-6" />
            Warranty Claims
          </div>
        }
        description="Manage warranty claims and track resolutions"
      />

      <PageLayout.Content>
        <WarrantyClaimsListContainer
          search={search}
          onSearchChange={updateSearch}
          onRowClick={(claimId) =>
            navigate({
              to: '/support/claims/$claimId' as string,
              params: { claimId },
            })
          }
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
