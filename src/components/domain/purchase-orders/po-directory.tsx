/**
 * Purchase Order Directory Component
 *
 * Main list view combining table, filters, pagination, and bulk receive.
 * Uses POListPresenter for responsive table + mobile cards with selection.
 * Status chips per DOMAIN-LANDING-STANDARDS.
 */

import { DomainFilterBar } from '@/components/shared/filters';
import { POListPresenter } from './po-list-presenter';
import { POStatusChips } from './po-status-chips';
import {
  usePOFilterConfig,
  DEFAULT_PO_FILTERS,
} from './po-filter-config';
import type {
  PurchaseOrderTableData,
  PurchaseOrderFiltersState,
  PurchaseOrderSortField,
} from '@/lib/schemas/purchase-orders';

// ============================================================================
// TYPES
// ============================================================================

interface PODirectoryProps {
  orders: PurchaseOrderTableData[];
  isLoading?: boolean;
  error?: Error | null;
  filters: PurchaseOrderFiltersState;
  onFiltersChange: (filters: PurchaseOrderFiltersState) => void;
  /** Status counts for filter chips (DOMAIN-LANDING-STANDARDS) */
  statusCounts?: {
    all: number;
    pending_approval: number;
    partial_received: number;
    overdue: number;
  } | null;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  sortField: PurchaseOrderSortField;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: string) => void;
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onShiftClickRange: (rowIndex: number) => void;
  isSelected: (id: string) => boolean;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReceive?: (id: string) => void;
  /** Retry handler for error state */
  onRetry?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PODirectory({
  orders,
  isLoading = false,
  error = null,
  filters,
  onFiltersChange,
  pagination,
  onPageChange,
  sortField,
  sortDirection,
  onSortChange,
  selectedIds,
  onSelect,
  onSelectAll,
  onShiftClickRange,
  isSelected,
  onView,
  onEdit,
  onDelete,
  onReceive,
  onRetry,
  statusCounts,
}: PODirectoryProps) {
  const filterConfig = usePOFilterConfig();
  const isAllSelected = orders.length > 0 && selectedIds.size === orders.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < orders.length;

  return (
    <div className="space-y-4">
      {statusCounts && (
        <POStatusChips
          counts={statusCounts}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      )}
      <DomainFilterBar<PurchaseOrderFiltersState>
        config={filterConfig}
        filters={filters}
        onFiltersChange={onFiltersChange}
        defaultFilters={DEFAULT_PO_FILTERS}
      />

      <div className="rounded-lg border">
        <POListPresenter
          orders={orders}
          isLoading={isLoading}
          error={error}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          onSelect={onSelect}
          onSelectAll={onSelectAll}
          onShiftClickRange={onShiftClickRange}
          isSelected={isSelected}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSortChange}
          onViewPO={onView ?? (() => {})}
          onEditPO={onEdit ?? (() => {})}
          onDeletePO={onDelete ?? (() => {})}
          onReceivePO={onReceive ?? (() => {})}
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.totalItems}
          onPageChange={onPageChange}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
}

export type { PODirectoryProps };
