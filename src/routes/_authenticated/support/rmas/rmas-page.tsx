/**
 * RMA List Page Component
 *
 * Displays all RMAs with filtering, sorting, and pagination.
 * Links to RMA detail view for workflow actions.
 *
 * @source rmas from useRmas hook
 *
 * @see src/routes/_authenticated/support/rmas/index.tsx - Route definition
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 * @see src/components/domain/support/rma-list.tsx
 */
import { useNavigate, Link } from '@tanstack/react-router';
import { Package, ExternalLink } from 'lucide-react';

import { PageLayout } from '@/components/layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RmaList } from '@/components/domain/support';
import { useRmas } from '@/hooks/support';
import type { RmaStatus, RmaReason } from '@/lib/schemas/support/rma';
import type { rmasSearchSchema } from './index';
import type { z } from 'zod';

type RmasSearch = z.infer<typeof rmasSearchSchema>;

interface RmasPageProps {
  search: RmasSearch;
}

export default function RmasPage({ search }: RmasPageProps) {
  const navigate = useNavigate();

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
  const totalCount = data?.pagination?.totalCount ?? 0;

  // Update search params
  const updateSearch = (updates: Partial<RmasSearch>) => {
    navigate({
      to: '.',
      search: {
        ...search,
        ...updates,
        // Reset to page 1 when filters change
        page: 'page' in updates ? updates.page : 1,
      },
    });
  };

  // Handle RMA click - navigate to detail
  const handleRmaClick = (rma: { id: string }) => {
    navigate({
      to: '/support/rmas/$rmaId',
      params: { rmaId: rma.id },
    });
  };

  const handleCreateRma = () => {
    navigate({ to: '/orders' });
  };

  return (
    <PageLayout variant="full-width">
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
          onCreateRma={handleCreateRma}
          showCreateButton
          pageSize={search.pageSize}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
