/**
 * Expiring Warranties Report Page
 *
 * Dedicated report page for warranties approaching expiration.
 * Features filter bar, data table with color-coded urgency, CSV export.
 *
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-003c.wireframe.md
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003c
 */

import { useState, useMemo, useCallback } from 'react';
import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import {
  Download,
  Filter,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { FormatAmount } from '@/components/shared/format';
import {
  useExpiringWarrantiesReport,
  useExpiringWarrantiesFilterOptions,
  type ExpiringWarrantyItem,
} from '@/hooks';

// ============================================================================
// ROUTE SEARCH PARAMS
// ============================================================================

const searchSchema = z.object({
  range: z.enum(['7', '30', '60', '90']).default('30').catch('30'),
  customer: z.string().optional(),
  product: z.string().optional(),
  status: z.enum(['active', 'expired', 'all']).default('active').catch('active'),
  sort: z
    .enum(['expiry_asc', 'expiry_desc', 'customer', 'product'])
    .default('expiry_asc')
    .catch('expiry_asc'),
  page: z.coerce.number().min(1).default(1).catch(1),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_authenticated/reports/expiring-warranties')({
  component: ExpiringWarrantiesReportPage,
  validateSearch: searchSchema,
});

// ============================================================================
// CONSTANTS
// ============================================================================

const RANGE_OPTIONS = [
  { value: '7', label: 'Next 7 days' },
  { value: '30', label: 'Next 30 days' },
  { value: '60', label: 'Next 60 days' },
  { value: '90', label: 'Next 90 days' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active only' },
  { value: 'expired', label: 'Expired only' },
  { value: 'all', label: 'All warranties' },
];

const SORT_OPTIONS = [
  { value: 'expiry_asc', label: 'Expiry (soonest first)' },
  { value: 'expiry_desc', label: 'Expiry (latest first)' },
  { value: 'customer', label: 'Customer A-Z' },
  { value: 'product', label: 'Product A-Z' },
];

const PAGE_SIZE = 20;

// ============================================================================
// HELPERS
// ============================================================================

function getUrgencyBadgeStyles(urgencyLevel: ExpiringWarrantyItem['urgencyLevel']) {
  switch (urgencyLevel) {
    case 'urgent':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'warning':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'approaching':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'healthy':
    default:
      return 'bg-green-100 text-green-700 border-green-200';
  }
}

function getRowUrgencyStyles(urgencyLevel: ExpiringWarrantyItem['urgencyLevel']) {
  if (urgencyLevel === 'urgent') {
    return 'bg-red-50/50 border-l-4 border-l-red-500';
  }
  return '';
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function generateCSV(warranties: ExpiringWarrantyItem[]): string {
  const headers = [
    'Warranty Number',
    'Product',
    'Customer',
    'Expiry Date',
    'Days Until Expiry',
    'Urgency',
    'Policy Type',
  ];

  const rows = warranties.map((w) => [
    w.warrantyNumber,
    w.productName ?? '',
    w.customerName ?? '',
    formatDate(w.expiryDate),
    w.daysUntilExpiry.toString(),
    w.urgencyLevel,
    w.policyType,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ExpiringWarrantiesReportPage() {
  const search = useSearch({ from: '/_authenticated/reports/expiring-warranties' });
  const navigate = useNavigate({ from: '/reports/expiring-warranties' });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Fetch data with search params
  const { data, isLoading, error, refetch } = useExpiringWarrantiesReport({
    days: parseInt(search.range, 10),
    customerId: search.customer,
    productId: search.product,
    status: search.status,
    sortBy: search.sort,
    page: search.page,
    limit: PAGE_SIZE,
  });

  // Fetch filter options
  const { data: filterOptions } = useExpiringWarrantiesFilterOptions();

  // Update search params
  const updateSearch = useCallback(
    (updates: Partial<SearchParams>) => {
      navigate({
        search: (prev) => ({
          ...prev,
          ...updates,
          // Reset to page 1 when filters change (except for page itself)
          page: 'page' in updates ? updates.page : 1,
        }),
      });
    },
    [navigate]
  );

  // Active filters for chips
  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (search.range !== '30') {
      filters.push({
        key: 'range',
        label: `${search.range} days`,
        onRemove: () => updateSearch({ range: '30' }),
      });
    }

    if (search.customer && filterOptions?.customers) {
      const customer = filterOptions.customers.find((c) => c.id === search.customer);
      filters.push({
        key: 'customer',
        label: customer?.name ?? 'Customer filter',
        onRemove: () => updateSearch({ customer: undefined }),
      });
    }

    if (search.product && filterOptions?.products) {
      const product = filterOptions.products.find((p) => p.id === search.product);
      filters.push({
        key: 'product',
        label: product?.name ?? 'Product filter',
        onRemove: () => updateSearch({ product: undefined }),
      });
    }

    if (search.status !== 'active') {
      filters.push({
        key: 'status',
        label: search.status === 'expired' ? 'Expired' : 'All statuses',
        onRemove: () => updateSearch({ status: 'active' }),
      });
    }

    return filters;
  }, [search, filterOptions, updateSearch]);

  // CSV Export
  const handleExport = useCallback(() => {
    if (!data?.warranties.length) return;

    const csv = generateCSV(data.warranties);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `expiring-warranties-${date}.csv`);
  }, [data]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    navigate({
      search: {
        range: '30',
        status: 'active',
        sort: 'expiry_asc',
        page: 1,
      },
    });
  }, [navigate]);

  const warranties = data?.warranties ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalValue = data?.totalValue ?? 0;
  const avgDaysToExpiry = data?.avgDaysToExpiry ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Expiring Warranties"
        description="Monitor warranties approaching expiration for renewal opportunities"
        actions={
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isLoading || !warranties.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />
      <PageLayout.Content>
        {/* Filter Bar - Desktop */}
        <div className="mb-6 hidden md:block">
          <FilterBar search={search} filterOptions={filterOptions} onUpdate={updateSearch} />
        </div>

        {/* Filter Button - Mobile */}
        <div className="mb-4 md:hidden">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Filter expiring warranties by date range, customer, product, and status.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <MobileFilterBar
                  search={search}
                  filterOptions={filterOptions}
                  onUpdate={(updates) => {
                    updateSearch(updates);
                    setMobileFiltersOpen(false);
                  }}
                  onClear={() => {
                    clearAllFilters();
                    setMobileFiltersOpen(false);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Active:</span>
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="secondary"
                className="cursor-pointer pr-1.5 hover:bg-gray-200"
                onClick={filter.onRemove}
              >
                {filter.label}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm text-gray-500 underline hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Summary Metrics */}
        {!isLoading && !error && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <SummaryCard
              label="Total Warranties"
              value={totalCount.toString()}
              sublabel={`in next ${search.range} days`}
            />
            <SummaryCard
              label="Total Value"
              value={<FormatAmount amount={totalValue} />}
              sublabel="warranty value"
            />
            <SummaryCard
              label="Avg Days to Expiry"
              value={avgDaysToExpiry.toString()}
              sublabel="days remaining"
            />
          </div>
        )}

        {/* Data Table */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState onRetry={() => refetch()} />
        ) : warranties.length === 0 ? (
          <EmptyState hasFilters={activeFilters.length > 0} onClearFilters={clearAllFilters} />
        ) : (
          <>
            {/* Results count */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(search.page - 1) * PAGE_SIZE + 1}-
                {Math.min(search.page * PAGE_SIZE, totalCount)} of {totalCount} warranties
              </p>
              <Select
                value={search.sort}
                onValueChange={(value) => updateSearch({ sort: value as SearchParams['sort'] })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Warranty
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase md:table-cell">
                      Product
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase lg:table-cell">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Expiry
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Days Left
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {warranties.map((warranty) => (
                    <WarrantyRow key={warranty.id} warranty={warranty} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                page={search.page}
                totalPages={totalPages}
                onPageChange={(page) => updateSearch({ page })}
              />
            )}
          </>
        )}
      </PageLayout.Content>
    </PageLayout>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface FilterBarProps {
  search: SearchParams;
  filterOptions?: {
    customers: { id: string; name: string | null }[];
    products: { id: string; name: string | null }[];
  };
  onUpdate: (updates: Partial<SearchParams>) => void;
}

function FilterBar({ search, filterOptions, onUpdate }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-gray-50 p-4">
      {/* Expiry Range */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Expiry Range</label>
        <Select
          value={search.range}
          onValueChange={(value) => onUpdate({ range: value as SearchParams['range'] })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Customer</label>
        <Select
          value={search.customer ?? 'all'}
          onValueChange={(value) => onUpdate({ customer: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {filterOptions?.customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name ?? 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Product</label>
        <Select
          value={search.product ?? 'all'}
          onValueChange={(value) => onUpdate({ product: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {filterOptions?.products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name ?? 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Status</label>
        <Select
          value={search.status}
          onValueChange={(value) => onUpdate({ status: value as SearchParams['status'] })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface MobileFilterBarProps extends FilterBarProps {
  onClear: () => void;
}

function MobileFilterBar({ search, filterOptions, onUpdate, onClear }: MobileFilterBarProps) {
  const [localFilters, setLocalFilters] = useState(search);

  const handleApply = () => {
    onUpdate(localFilters);
  };

  return (
    <div className="space-y-6">
      {/* Expiry Range */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Expiry Range</label>
        <div className="space-y-2">
          {RANGE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-gray-50"
            >
              <input
                type="radio"
                name="range"
                value={option.value}
                checked={localFilters.range === option.value}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    range: e.target.value as SearchParams['range'],
                  }))
                }
                className="h-4 w-4 text-blue-600"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {/* Customer */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Customer</label>
        <Select
          value={localFilters.customer ?? 'all'}
          onValueChange={(value) =>
            setLocalFilters((prev) => ({ ...prev, customer: value === 'all' ? undefined : value }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {filterOptions?.customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name ?? 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Product</label>
        <Select
          value={localFilters.product ?? 'all'}
          onValueChange={(value) =>
            setLocalFilters((prev) => ({ ...prev, product: value === 'all' ? undefined : value }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {filterOptions?.products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name ?? 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
        <Select
          value={localFilters.status}
          onValueChange={(value) =>
            setLocalFilters((prev) => ({ ...prev, status: value as SearchParams['status'] }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t pt-4">
        <Button variant="outline" onClick={onClear} className="flex-1">
          Clear All
        </Button>
        <Button onClick={handleApply} className="flex-1">
          Apply Filters
        </Button>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: React.ReactNode;
  sublabel: string;
}

function SummaryCard({ label, value, sublabel }: SummaryCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sublabel}</p>
    </div>
  );
}

interface WarrantyRowProps {
  warranty: ExpiringWarrantyItem;
}

function WarrantyRow({ warranty }: WarrantyRowProps) {
  return (
    <tr
      className={cn(
        'cursor-pointer transition-colors hover:bg-gray-50',
        getRowUrgencyStyles(warranty.urgencyLevel)
      )}
    >
      <td className="px-6 py-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{warranty.warrantyNumber}</p>
          <p className="text-sm text-gray-500 md:hidden">{warranty.productName ?? 'Unknown'}</p>
          <p className="text-xs text-gray-400 lg:hidden">{warranty.customerName ?? 'Unknown'}</p>
        </div>
      </td>
      <td className="hidden px-6 py-4 md:table-cell">
        <p className="text-sm text-gray-900">{warranty.productName ?? 'Unknown'}</p>
        {warranty.productSerial && (
          <p className="text-xs text-gray-500">S/N: {warranty.productSerial}</p>
        )}
      </td>
      <td className="hidden px-6 py-4 lg:table-cell">
        <p className="text-sm text-gray-900">{warranty.customerName ?? 'Unknown'}</p>
      </td>
      <td className="px-6 py-4">
        <p className="text-sm text-gray-900">{formatDate(warranty.expiryDate)}</p>
      </td>
      <td className="px-6 py-4 text-right">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
            getUrgencyBadgeStyles(warranty.urgencyLevel)
          )}
        >
          {warranty.daysUntilExpiry}d
        </span>
      </td>
    </tr>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className="mt-6 flex items-center justify-center gap-1"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {getPageNumbers().map((pageNum, idx) =>
        pageNum === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
            ...
          </span>
        ) : (
          <Button
            key={pageNum}
            variant={pageNum === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(pageNum)}
            aria-label={`Page ${pageNum}${pageNum === page ? ', current' : ''}`}
            aria-current={pageNum === page ? 'page' : undefined}
          >
            {pageNum}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Go to next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary metrics skeleton */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-white p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border">
        <div className="bg-gray-50 px-6 py-3">
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-t px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

function EmptyState({ hasFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
      <h3 className="mb-2 text-lg font-medium text-gray-900">
        {hasFilters ? 'No warranties match your filters' : 'All warranties are healthy'}
      </h3>
      <p className="mb-6 max-w-md text-sm text-gray-500">
        {hasFilters
          ? 'Try adjusting your filter criteria to see more results.'
          : 'No warranties are expiring in the selected date range. Great job managing your warranty portfolio!'}
      </p>
      {hasFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="mb-4 h-16 w-16 text-amber-500" />
      <h3 className="mb-2 text-lg font-medium text-gray-900">Unable to load warranties</h3>
      <p className="mb-6 max-w-md text-sm text-gray-500">
        There was a problem fetching the report data. Please try again.
      </p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

export default ExpiringWarrantiesReportPage;
