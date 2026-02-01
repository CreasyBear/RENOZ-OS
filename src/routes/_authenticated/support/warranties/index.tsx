/**
 * Warranty List Page
 *
 * Lists warranties with filtering and pagination.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json
 */
import { createFileRoute } from '@tanstack/react-router';
import type { FileRoutesByPath } from '@tanstack/react-router';
import { z } from 'zod';
import { Shield } from 'lucide-react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportTableSkeleton } from '@/components/skeletons/support';
import { WarrantyListContainer, type WarrantyListItem } from '@/components/domain/warranty';

const searchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'expiring_soon', 'expired', 'voided', 'transferred']).optional(),
  policyType: z
    .enum(['battery_performance', 'inverter_manufacturer', 'installation_workmanship'])
    .optional(),
  page: z.coerce.number().min(1).default(1).catch(1),
  pageSize: z.coerce.number().min(10).max(100).default(20).catch(20),
  sortBy: z.enum(['createdAt', 'expiryDate', 'status']).default('expiryDate').catch('expiryDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc').catch('asc'),
});

export const Route = createFileRoute(
  '/_authenticated/support/warranties/' as keyof FileRoutesByPath
)({
  validateSearch: searchSchema,
  component: WarrantyListPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Warranties"
        description="View and manage warranty registrations"
      />
      <PageLayout.Content>
        <SupportTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function WarrantyListPage() {
  type SearchParams = z.infer<typeof searchSchema>;
  const search = Route.useSearch() as SearchParams;
  const navigate = Route.useNavigate() as (args: {
    to?: string;
    params?: Record<string, string>;
    search?: ((prev: SearchParams) => SearchParams) | SearchParams;
  }) => void;

  const updateSearch = (updates: Partial<SearchParams>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
        page: 'page' in updates ? updates.page ?? 1 : 1,
      }),
    });
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Warranties
          </div>
        }
        description="View and manage warranty registrations"
      />

      <PageLayout.Content>
        <div className="space-y-4">
          <WarrantyListContainer
            search={search}
            onSearchChange={updateSearch}
            onRowClick={(warranty: WarrantyListItem) =>
              navigate({
                to: '/support/warranties/$warrantyId',
                params: { warrantyId: warranty.id },
              })
            }
          />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
