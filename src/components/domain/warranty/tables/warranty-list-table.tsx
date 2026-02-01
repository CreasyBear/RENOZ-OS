/**
 * Warranty List Table
 *
 * Presenter for warranty list table with selection support and pagination controls.
 * Follows TABLE-STANDARDS pattern with external column definitions.
 */
"use client";

import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { Shield } from "lucide-react";
import { DataTable, DataTablePagination } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  createWarrantyColumns,
  type WarrantyTableItem,
  type CreateWarrantyColumnsOptions,
} from "./warranty-columns";

// Re-export the type for external use
export type { WarrantyTableItem as WarrantyListItem } from "./warranty-columns";

interface WarrantyListTableProps {
  warranties: WarrantyTableItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onRowClick?: (warranty: WarrantyTableItem) => void;
  onPageChange: (page: number) => void;
  className?: string;
  // Selection props
  selectedIds?: Set<string>;
  onSelect?: (id: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  onShiftClickRange?: (rowIndex: number) => void;
  // Action handlers
  onViewCertificate?: (id: string) => void;
  onVoidWarranty?: (id: string) => void;
  onTransferWarranty?: (id: string) => void;
}

export function WarrantyListTable({
  warranties,
  total,
  page,
  pageSize,
  isLoading,
  error,
  onRetry,
  onRowClick,
  onPageChange,
  className,
  // Selection props with defaults
  selectedIds = new Set(),
  onSelect = () => {},
  onSelectAll = () => {},
  onShiftClickRange = () => {},
  // Action handlers
  onViewCertificate,
  onVoidWarranty,
  onTransferWarranty,
}: WarrantyListTableProps) {
  // Selection state derived from props
  const isSelected = (id: string) => selectedIds.has(id);
  const isAllSelected = warranties.length > 0 && warranties.every((w) => selectedIds.has(w.id));
  const isPartiallySelected =
    warranties.some((w) => selectedIds.has(w.id)) && !isAllSelected;

  // Create column options
  const columnOptions: CreateWarrantyColumnsOptions = useMemo(
    () => ({
      onSelect,
      onShiftClickRange,
      isAllSelected,
      isPartiallySelected,
      onSelectAll,
      isSelected,
      onViewWarranty: (id) => {
        const warranty = warranties.find((w) => w.id === id);
        if (warranty && onRowClick) {
          onRowClick(warranty);
        }
      },
      onViewCertificate,
      onVoidWarranty,
      onTransferWarranty,
    }),
    [
      onSelect,
      onShiftClickRange,
      isAllSelected,
      isPartiallySelected,
      onSelectAll,
      isSelected,
      warranties,
      onRowClick,
      onViewCertificate,
      onVoidWarranty,
      onTransferWarranty,
    ]
  );

  const columns = useMemo(
    () => createWarrantyColumns(columnOptions),
    [columnOptions]
  );

  // Create table instance for pagination component
  const table = useReactTable({
    data: warranties,
    columns,
    pageCount: Math.ceil(total / pageSize),
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newState = updater({ pageIndex: page - 1, pageSize });
        onPageChange(newState.pageIndex + 1);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  if (error) {
    return (
      <ErrorState
        title="Failed to load warranties"
        message={error.message}
        onRetry={() => onRetry?.()}
        className={className}
      />
    );
  }

  if (!isLoading && warranties.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="No warranties found"
        message="Try adjusting filters or check back after registering warranties."
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      <DataTable
        data={warranties}
        columns={columns}
        enableSorting
        onRowClick={onRowClick}
        isLoading={isLoading}
        className="rounded-lg border"
      />

      <div className="mt-4">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
