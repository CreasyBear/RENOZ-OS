/**
 * RMA List Page Component
 *
 * Displays all RMAs with filtering, sorting, pagination, and bulk actions.
 * Uses RmasListContainer per STANDARDS §2 (container owns data).
 *
 * @see src/routes/_authenticated/support/rmas/index.tsx - Route definition
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 * @see src/components/domain/support/rma/rmas-list-container.tsx
 */
import { useNavigate, Link } from '@tanstack/react-router';
import { Package, ExternalLink } from 'lucide-react';

import { PageLayout } from '@/components/layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RmasListContainer } from '@/components/domain/support/rma/rmas-list-container';
import type { RmaStatus, RmaReason } from '@/lib/schemas/support/rma';
import type { rmasSearchSchema } from './index';
import type { z } from 'zod';

type RmasSearch = z.infer<typeof rmasSearchSchema>;

interface RmasPageProps {
  search: RmasSearch;
}

export default function RmasPage({ search }: RmasPageProps) {
  const navigate = useNavigate();

  const updateSearch = (updates: Partial<RmasSearch>) => {
    navigate({
      to: '.',
      search: {
        ...search,
        ...updates,
        page: 'page' in updates ? updates.page : 1,
      },
    });
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

        <RmasListContainer
          status={search.status}
          reason={search.reason}
          search={search.search}
          page={search.page}
          pageSize={search.pageSize}
          sortBy={search.sortBy}
          sortOrder={search.sortOrder}
          onCreateRma={() => navigate({ to: '/orders' })}
          onStatusFilterChange={(value) =>
            updateSearch({ status: value === 'all' ? undefined : (value as RmaStatus) })
          }
          onReasonFilterChange={(value) =>
            updateSearch({ reason: value === 'all' ? undefined : (value as RmaReason) })
          }
          onSearchChange={(value) => updateSearch({ search: value || undefined })}
          onPageChange={(page) => updateSearch({ page })}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
