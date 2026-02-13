/**
 * Expiring Warranties Report (Presenter)
 *
 * Pure UI for expiring warranties table, filters, and pagination.
 * Data and handlers passed from container.
 */

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Download,
  Filter,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateAustralian } from '@/lib/warranty';
import { expiringWarrantyUrgencyConfig } from '@/lib/reports/expiring-warranty-urgency-config';
import { ReportFavoriteButton } from './report-favorite-button';
import { ScheduledReportForm } from '@/components/domain/settings/scheduled-report-form';
import type { CreateScheduledReportInput } from '@/lib/schemas/reports/scheduled-reports';
import type { ExpiringWarrantyItem } from '@/hooks/warranty/core/use-expiring-warranties';
import type { ExpiringWarrantiesSearchParams } from '@/lib/schemas/reports/expiring-warranties';

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

// ============================================================================
// TYPES
// ============================================================================

export interface ExpiringWarrantiesReportProps {
  search: ExpiringWarrantiesSearchParams;
  warranties: ExpiringWarrantyItem[];
  totalCount: number;
  totalValue: number;
  avgDaysToExpiry: number;
  totalPages: number;
  pageSize: number;
  isLoading: boolean;
  error: Error | null;
  filterOptions?: {
    customers: { id: string; name: string | null }[];
    products: { id: string; name: string | null }[];
  };
  activeFilters: Array<{ key: string; label: string; onRemove: () => void }>;
  onUpdateSearch: (updates: Partial<ExpiringWarrantiesSearchParams>) => void;
  onClearFilters: () => void;
  onExport: (format: 'csv' | 'pdf' | 'excel') => void;
  onRetry: () => void;
  onScheduleSubmit: (input: CreateScheduledReportInput) => Promise<void>;
  isScheduleSubmitting: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getUrgencyBadgeStyles(urgencyLevel: ExpiringWarrantyItem['urgencyLevel']) {
  return expiringWarrantyUrgencyConfig[urgencyLevel]?.className ?? expiringWarrantyUrgencyConfig.healthy.className;
}

function getRowUrgencyStyles(urgencyLevel: ExpiringWarrantyItem['urgencyLevel']) {
  return expiringWarrantyUrgencyConfig[urgencyLevel]?.rowClassName ?? '';
}

// ============================================================================
// PRESENTER
// ============================================================================

export function ExpiringWarrantiesReport({
  search,
  warranties,
  totalCount,
  totalValue,
  avgDaysToExpiry,
  totalPages,
  pageSize,
  isLoading,
  error,
  filterOptions,
  activeFilters,
  onUpdateSearch,
  onClearFilters,
  onExport,
  onRetry,
  onScheduleSubmit,
  isScheduleSubmitting,
}: ExpiringWarrantiesReportProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const openSchedule = () => setScheduleOpen(true);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">Expiring Warranties Report</div>
        <div className="flex items-center gap-2">
          <ReportFavoriteButton reportType="expiring-warranties" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport('csv')}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('pdf')}>Export PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('excel')}>Export Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={openSchedule}>
            <Mail className="mr-2 h-4 w-4" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Filter Bar - Desktop */}
      <div className="mb-6 hidden md:block">
        <FilterBar search={search} filterOptions={filterOptions} onUpdate={onUpdateSearch} />
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
                  onUpdateSearch(updates);
                  setMobileFiltersOpen(false);
                }}
                onClear={() => {
                  onClearFilters();
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
            onClick={onClearFilters}
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
        <ErrorState onRetry={onRetry} />
      ) : warranties.length === 0 ? (
        <EmptyState hasFilters={activeFilters.length > 0} onClearFilters={onClearFilters} />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(search.page - 1) * pageSize + 1}-
              {Math.min(search.page * pageSize, totalCount)} of {totalCount} warranties
            </p>
            <Select
              value={search.sort}
              onValueChange={(value) =>
                onUpdateSearch({ sort: value as ExpiringWarrantiesSearchParams['sort'] })
              }
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

          {totalPages > 1 && (
            <Pagination
              page={search.page}
              totalPages={totalPages}
              onPageChange={(page) => onUpdateSearch({ page })}
            />
          )}
        </>
      )}

      <ScheduledReportForm
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSubmit={onScheduleSubmit}
        isSubmitting={isScheduleSubmitting}
        defaultValues={{
          name: 'Expiring Warranties Report',
          description: 'Upcoming warranty expirations with urgency breakdown',
          metrics: {
            metrics: ['expiring_warranties', 'warranty_count', 'warranty_value'],
            includeCharts: true,
            includeTrends: true,
            comparisonPeriod: 'previous_period',
          },
        }}
      />
    </>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface FilterBarProps {
  search: ExpiringWarrantiesSearchParams;
  filterOptions?: {
    customers: { id: string; name: string | null }[];
    products: { id: string; name: string | null }[];
  };
  onUpdate: (updates: Partial<ExpiringWarrantiesSearchParams>) => void;
}

function FilterBar({ search, filterOptions, onUpdate }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-gray-50 p-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Expiry Range</label>
        <Select
          value={search.range}
          onValueChange={(value) => onUpdate({ range: value as ExpiringWarrantiesSearchParams['range'] })}
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
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Status</label>
        <Select
          value={search.status}
          onValueChange={(value) => onUpdate({ status: value as ExpiringWarrantiesSearchParams['status'] })}
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
                    range: e.target.value as ExpiringWarrantiesSearchParams['range'],
                  }))
                }
                className="h-4 w-4 text-blue-600"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
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
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
        <Select
          value={localFilters.status}
          onValueChange={(value) =>
            setLocalFilters((prev) => ({ ...prev, status: value as ExpiringWarrantiesSearchParams['status'] }))
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

function SummaryCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: React.ReactNode;
  sublabel: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sublabel}</p>
    </div>
  );
}

function WarrantyRow({ warranty }: { warranty: ExpiringWarrantyItem }) {
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
          <span className="text-xs text-gray-400 lg:hidden">
            {warranty.customerId ? (
              <Link
                to="/customers/$customerId"
                params={{ customerId: warranty.customerId }}
                search={{}}
                className="text-primary hover:underline"
              >
                {warranty.customerName ?? 'Unknown'}
              </Link>
            ) : (
              warranty.customerName ?? 'Unknown'
            )}
          </span>
        </div>
      </td>
      <td className="hidden px-6 py-4 md:table-cell">
        <p className="text-sm text-gray-900">{warranty.productName ?? 'Unknown'}</p>
        {warranty.productSerial && (
          <p className="text-xs text-gray-500">S/N: {warranty.productSerial}</p>
        )}
      </td>
      <td className="hidden px-6 py-4 lg:table-cell">
        {warranty.customerId ? (
          <Link
            to="/customers/$customerId"
            params={{ customerId: warranty.customerId }}
            search={{}}
            className="text-sm text-primary hover:underline"
          >
            {warranty.customerName ?? 'Unknown'}
          </Link>
        ) : (
          <p className="text-sm text-gray-900">{warranty.customerName ?? 'Unknown'}</p>
        )}
      </td>
      <td className="px-6 py-4">
        <p className="text-sm text-gray-900">{formatDateAustralian(warranty.expiryDate, 'short')}</p>
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

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const getPageNumbers = (): (number | 'ellipsis')[] => {
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
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-white p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
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

function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
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

function ErrorState({ onRetry }: { onRetry: () => void }) {
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
