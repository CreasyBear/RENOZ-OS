/**
 * Purchase Order Directory Component
 *
 * Main list view combining table, filters, and pagination.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { POTable } from './po-table';
import { POFilters } from './po-filters';
import type {
  PurchaseOrderTableData,
  PurchaseOrderFiltersState,
} from '@/lib/schemas/purchase-orders';

// ============================================================================
// TYPES
// ============================================================================

interface PODirectoryProps {
  orders: PurchaseOrderTableData[];
  isLoading?: boolean;
  filters: PurchaseOrderFiltersState;
  onFiltersChange: (filters: PurchaseOrderFiltersState) => void;
  onSearch: (search: string) => void;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReceive?: (id: string) => void;
}

// ============================================================================
// PAGINATION
// ============================================================================

function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <p className="text-muted-foreground text-sm">
        Showing {startItem}-{endItem} of {totalItems} orders
      </p>
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
          {totalPages > 5 && (
            <>
              <span className="text-muted-foreground px-1">...</span>
              <Button
                variant={totalPages === page ? 'default' : 'outline'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange(totalPages)}
              >
                {totalPages}
              </Button>
            </>
          )}
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
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PODirectory({
  orders,
  isLoading = false,
  filters,
  onFiltersChange,
  onSearch,
  pagination,
  onPageChange,
  onView,
  onEdit,
  onDelete,
  onReceive,
}: PODirectoryProps) {
  return (
    <div className="space-y-4">
      <POFilters filters={filters} onFiltersChange={onFiltersChange} onSearch={onSearch} />

      <div className="rounded-lg border">
        <POTable
          orders={orders}
          isLoading={isLoading}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onReceive={onReceive}
        />

        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}

export type { PODirectoryProps };
