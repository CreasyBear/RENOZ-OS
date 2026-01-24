/**
 * Pricing Management Component
 *
 * Main component for supplier price list management.
 * Combines filters, table, and pagination.
 *
 * @see SUPP-PRICING-MANAGEMENT story
 */

import { useMemo } from 'react';
import { Plus, Download, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PricingTable } from './pricing-table';
import { PricingFilters } from './pricing-filters';
import type { PriceListFilters, PriceListRow } from '@/lib/schemas/pricing';

// ============================================================================
// TYPES
// ============================================================================

interface Supplier {
  id: string;
  name: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface PricingManagementProps {
  items: PriceListRow[];
  pagination: PaginationInfo;
  filters: PriceListFilters;
  onFiltersChange: (filters: Partial<PriceListFilters>) => void;
  suppliers?: Supplier[];
  isLoading?: boolean;
  onAddPrice?: () => void;
  onEditPrice?: (id: string) => void;
  onDeletePrice?: (id: string) => void;
  onSetPreferred?: (id: string, preferred: boolean) => void;
  onImport?: () => void;
  onExport?: () => void;
}

// ============================================================================
// PAGINATION
// ============================================================================

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Previous
      </Button>
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const pageNum = i + 1;
          return (
            <Button
              key={pageNum}
              variant={pageNum === page ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </Button>
          );
        })}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PricingManagement({
  items,
  pagination,
  filters,
  onFiltersChange,
  suppliers = [],
  isLoading = false,
  onAddPrice,
  onEditPrice,
  onDeletePrice,
  onSetPreferred,
  onImport,
  onExport,
}: PricingManagementProps) {
  const handlePageChange = (page: number) => {
    onFiltersChange({ page });
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    const activeCount = items.filter((i) => i.status === 'active').length;
    const preferredCount = items.filter((i) => i.isPreferredPrice).length;
    const expiringCount = items.filter((i) => {
      if (!i.expiryDate) return false;
      const expiry = new Date(i.expiryDate);
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 30);
      return expiry > today && expiry <= in30Days;
    }).length;

    return { activeCount, preferredCount, expiringCount };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Price Lists</h3>
          <p className="text-muted-foreground text-sm">Manage supplier pricing for products</p>
        </div>
        <div className="flex items-center gap-2">
          {onImport && (
            <Button variant="outline" size="sm" onClick={onImport}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
          {onAddPrice && (
            <Button size="sm" onClick={onAddPrice}>
              <Plus className="mr-2 h-4 w-4" />
              Add Price
            </Button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.activeCount}</div>
            <p className="text-muted-foreground text-xs">Active Prices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.preferredCount}</div>
            <p className="text-muted-foreground text-xs">Preferred Suppliers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.expiringCount}</div>
            <p className="text-muted-foreground text-xs">Expiring in 30 Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <PricingFilters filters={filters} onFiltersChange={onFiltersChange} suppliers={suppliers} />

      {/* Table */}
      <PricingTable
        items={items}
        isLoading={isLoading}
        onEdit={onEditPrice}
        onDelete={onDeletePrice}
        onSetPreferred={onSetPreferred}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of{' '}
            {pagination.totalItems} items
          </p>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

export { PricingManagement };
export type { PricingManagementProps, PaginationInfo };
