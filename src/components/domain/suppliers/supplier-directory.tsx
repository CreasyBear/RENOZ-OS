/**
 * Supplier Directory Component
 *
 * Main supplier list view combining filters, table, and pagination.
 * This is the primary UI for the SUPP-SUPPLIER-DIRECTORY story.
 */

import { SupplierTable, type SupplierTableData } from './supplier-table';
import { SupplierFilters } from './supplier-filters';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { SupplierFiltersState } from '@/lib/schemas/suppliers';

// ============================================================================
// TYPES
// ============================================================================

interface SupplierDirectoryProps {
  suppliers: SupplierTableData[];
  isLoading?: boolean;
  filters: SupplierFiltersState;
  onFiltersChange: (filters: SupplierFiltersState) => void;
  onSearch: (search: string) => void;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SupplierDirectory({
  suppliers,
  isLoading,
  filters,
  onFiltersChange,
  onSearch,
  pagination,
  onPageChange,
  onDelete,
  onEdit,
}: SupplierDirectoryProps) {
  const { page, totalPages, totalItems } = pagination;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      // Adjust if at the beginning or end
      if (page <= 2) {
        end = Math.min(totalPages - 1, 4);
      } else if (page >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }

      // Add ellipsis and middle pages
      if (start > 2) {
        pages.push(-1); // Ellipsis marker
      }
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (end < totalPages - 1) {
        pages.push(-2); // Ellipsis marker
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <SupplierFilters filters={filters} onFiltersChange={onFiltersChange} onSearch={onSearch} />

      {/* Results count */}
      {!isLoading && (
        <div className="text-muted-foreground text-sm">
          {totalItems === 0
            ? 'No suppliers found'
            : totalItems === 1
              ? '1 supplier'
              : `${totalItems} suppliers`}
        </div>
      )}

      {/* Table */}
      <SupplierTable
        suppliers={suppliers}
        isLoading={isLoading}
        onDelete={onDelete}
        onEdit={onEdit}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {getPageNumbers().map((pageNum, idx) =>
                pageNum < 0 ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <span className="px-2">...</span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => onPageChange(pageNum)}
                      isActive={pageNum === page}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className={
                    page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
