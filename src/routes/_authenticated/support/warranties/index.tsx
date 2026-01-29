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
import { useMemo } from 'react';
import { Search, Shield } from 'lucide-react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportTableSkeleton } from '@/components/skeletons/support';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWarranties } from '@/hooks/warranty';
import { WarrantyListTable, type WarrantyListItem } from '@/components/domain/warranty';

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

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'voided', label: 'Voided' },
  { value: 'transferred', label: 'Transferred' },
];

const POLICY_TYPE_OPTIONS = [
  { value: 'battery_performance', label: 'Battery Performance' },
  { value: 'inverter_manufacturer', label: 'Inverter Manufacturer' },
  { value: 'installation_workmanship', label: 'Installation Workmanship' },
];

function WarrantyListPage() {
  type SearchParams = z.infer<typeof searchSchema>;
  const search = Route.useSearch() as SearchParams;
  const navigate = Route.useNavigate() as (args: {
    to?: string;
    params?: Record<string, string>;
    search?: ((prev: SearchParams) => SearchParams) | SearchParams;
  }) => void;

  const filters = useMemo(
    () => ({
      search: search.search,
      status: search.status,
      policyType: search.policyType,
      sortBy: search.sortBy,
      sortOrder: search.sortOrder,
      limit: search.pageSize,
      offset: (search.page - 1) * search.pageSize,
    }),
    [search]
  );

  const { data, isLoading, error, refetch } = useWarranties(filters);
  const warranties = data?.warranties ?? [];
  const total = data?.total ?? 0;

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
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
              <Input
                value={search.search ?? ''}
                placeholder="Search warranty number, customer, product..."
                className="pl-9"
                onChange={(event) => updateSearch({ search: event.target.value || undefined })}
              />
            </div>
            <Select
              value={search.status ?? 'all'}
              onValueChange={(value) =>
                updateSearch({ status: value === 'all' ? undefined : (value as SearchParams['status']) })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={search.policyType ?? 'all'}
              onValueChange={(value) =>
                updateSearch({
                  policyType: value === 'all' ? undefined : (value as SearchParams['policyType']),
                })
              }
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Policy type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All policy types</SelectItem>
                {POLICY_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <WarrantyListTable
            warranties={warranties}
            total={total}
            page={search.page}
            pageSize={search.pageSize}
            isLoading={isLoading}
            error={error instanceof Error ? error : null}
            onRetry={refetch}
            onRowClick={(warranty: WarrantyListItem) =>
              navigate({
                to: '/support/warranties/$warrantyId',
                params: { warrantyId: warranty.id },
              })
            }
            onPageChange={(page: number) => updateSearch({ page })}
          />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
