/**
 * RMA List Page
 *
 * Displays all RMAs with filtering, sorting, and pagination.
 * Links to RMA detail view for workflow actions.
 *
 * Note: RMA creation requires an order context. Create RMAs from:
 * - Order detail page (/orders/$orderId -> RMA tab)
 * - Issue detail page (/support/issues/$issueId -> Create RMA action)
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 * @see src/components/domain/support/rma-list.tsx
 */
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { z } from 'zod';
import { Package, ExternalLink } from 'lucide-react';

import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RmaList } from '@/components/domain/support/rma-list';
import { useRmas } from '@/hooks/support';
import type { RmaStatus, RmaReason, RmaResponse } from '@/lib/schemas/support/rma';

// ============================================================================
// ROUTE SEARCH PARAMS
// ============================================================================

const rmasSearchSchema = z.object({
  status: z
    .enum(['requested', 'approved', 'received', 'processed', 'rejected'])
    .optional(),
  reason: z
    .enum([
      'defective',
      'damaged_in_shipping',
      'wrong_item',
      'not_as_described',
      'performance_issue',
      'installation_failure',
      'other',
    ])
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  sortBy: z.enum(['createdAt', 'rmaNumber', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const Route = createFileRoute('/_authenticated/support/rmas/')({
  validateSearch: rmasSearchSchema,
  component: RmasListPage,
});

// ============================================================================
// COMPONENT
// ============================================================================

function RmasListPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  // Fetch RMAs
  const { data, isLoading, error, refetch } = useRmas({
    status: search.status,
    reason: search.reason,
    search: search.search,
    page: search.page,
    pageSize: search.pageSize,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
  });

  const rmas = data?.data ?? [];
  const totalCount = data?.pagination?.total ?? 0;

  // Update search params
  const updateSearch = (updates: Partial<z.infer<typeof rmasSearchSchema>>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
        // Reset to page 1 when filters change
        page: 'page' in updates ? updates.page : 1,
      }),
    });
  };

  // Handle RMA click - navigate to detail
  const handleRmaClick = (rma: RmaResponse) => {
    navigate({
      to: '/support/rmas/$rmaId',
      params: { rmaId: rma.id },
    });
  };

  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            Return Authorizations
          </div>
        }
        description="Manage product returns and RMA workflow"
      />

      <PageLayout.Content>
        {/* Info about creating RMAs */}
        <Alert className="mb-4">
          <ExternalLink className="h-4 w-4" />
          <AlertTitle>Creating RMAs</AlertTitle>
          <AlertDescription>
            To create a new RMA, go to an{' '}
            <Link to="/orders" className="text-primary underline">
              order detail page
            </Link>{' '}
            and select items to return.
          </AlertDescription>
        </Alert>

        <RmaList
          rmas={rmas}
          totalCount={totalCount}
          isLoading={isLoading}
          error={error instanceof Error ? error : null}
          onRetry={refetch}
          statusFilter={search.status ?? 'all'}
          reasonFilter={search.reason ?? 'all'}
          searchQuery={search.search ?? ''}
          page={search.page}
          onStatusFilterChange={(value) =>
            updateSearch({ status: value === 'all' ? undefined : (value as RmaStatus) })
          }
          onReasonFilterChange={(value) =>
            updateSearch({ reason: value === 'all' ? undefined : (value as RmaReason) })
          }
          onSearchChange={(value) => updateSearch({ search: value || undefined })}
          onPageChange={(page) => updateSearch({ page })}
          onRmaClick={handleRmaClick}
          showCreateButton={false}
          pageSize={search.pageSize}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
