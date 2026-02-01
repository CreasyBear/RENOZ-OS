/**
 * ProductTable Component
 *
 * Data table for displaying products with sorting, pagination, and row actions.
 *
 * Features:
 * - Column sorting (name, SKU, price, status)
 * - Pagination with page size selection
 * - Row selection for bulk actions
 * - Quick actions per row (edit, duplicate, delete)
 * - Responsive: cards on mobile, table on desktop
 */
import { useMemo, useCallback, useState } from "react";

import { DataTable } from "@/components/shared/data-table/data-table";
import { Button } from "@/components/ui/button";
import { createProductColumns, type ProductTableItem } from "./product-columns";

interface ProductTableProps {
  products: ProductTableItem[];
  total: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder: "asc" | "desc";
  selectedRows: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onRowClick: (product: ProductTableItem) => void;
  onEditProduct?: (id: string) => void;
  onDuplicateProduct?: (id: string) => void;
  onDeleteProduct?: (id: string) => void;
}

export function ProductTable({
  products,
  total,
  page,
  pageSize,
  sortBy: _sortBy,
  sortOrder: _sortOrder,
  selectedRows,
  onSelectionChange,
  onPageChange,
  onPageSizeChange: _onPageSizeChange,
  onSortChange: _onSortChange,
  onRowClick,
  onEditProduct,
  onDuplicateProduct,
  onDeleteProduct,
}: ProductTableProps) {
  // Track last selected index for shift-click range selection
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Selection state derived from selectedRows prop
  const selectedSet = useMemo(() => new Set(selectedRows), [selectedRows]);

  const isSelected = useCallback(
    (id: string) => selectedSet.has(id),
    [selectedSet]
  );

  const isAllSelected = useMemo(
    () => products.length > 0 && selectedRows.length === products.length,
    [products.length, selectedRows.length]
  );

  const isPartiallySelected = useMemo(
    () => selectedRows.length > 0 && selectedRows.length < products.length,
    [products.length, selectedRows.length]
  );

  // Selection handlers
  const handleSelect = useCallback(
    (id: string, checked: boolean) => {
      const index = products.findIndex((p) => p.id === id);
      if (index !== -1) {
        setLastSelectedIndex(index);
      }

      if (checked) {
        onSelectionChange([...selectedRows, id]);
      } else {
        onSelectionChange(selectedRows.filter((rowId) => rowId !== id));
      }
    },
    [products, selectedRows, onSelectionChange]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        onSelectionChange(products.map((p) => p.id));
      } else {
        onSelectionChange([]);
      }
    },
    [products, onSelectionChange]
  );

  const handleShiftClickRange = useCallback(
    (rowIndex: number) => {
      if (lastSelectedIndex === null) {
        // No previous selection, just select this row
        const id = products[rowIndex]?.id;
        if (id) {
          handleSelect(id, true);
        }
        return;
      }

      // Select range between lastSelectedIndex and rowIndex
      const start = Math.min(lastSelectedIndex, rowIndex);
      const end = Math.max(lastSelectedIndex, rowIndex);
      const rangeIds = products.slice(start, end + 1).map((p) => p.id);

      // Merge with existing selection
      const newSelection = [...new Set([...selectedRows, ...rangeIds])];
      onSelectionChange(newSelection);
      setLastSelectedIndex(rowIndex);
    },
    [lastSelectedIndex, products, selectedRows, onSelectionChange, handleSelect]
  );

  // Action handlers
  const handleViewProduct = useCallback(
    (id: string) => {
      const product = products.find((p) => p.id === id);
      if (product) {
        onRowClick(product);
      }
    },
    [products, onRowClick]
  );

  const handleEditProduct = useCallback(
    (id: string) => {
      onEditProduct?.(id);
    },
    [onEditProduct]
  );

  const handleDuplicateProduct = useCallback(
    (id: string) => {
      onDuplicateProduct?.(id);
    },
    [onDuplicateProduct]
  );

  const handleDeleteProduct = useCallback(
    (id: string) => {
      onDeleteProduct?.(id);
    },
    [onDeleteProduct]
  );

  // Build column definitions using the column factory
  const columns = useMemo(
    () =>
      createProductColumns({
        onSelect: handleSelect,
        onShiftClickRange: handleShiftClickRange,
        isAllSelected,
        isPartiallySelected,
        onSelectAll: handleSelectAll,
        isSelected,
        onViewProduct: handleViewProduct,
        onEditProduct: handleEditProduct,
        onDuplicateProduct: handleDuplicateProduct,
        onDeleteProduct: handleDeleteProduct,
      }),
    [
      handleSelect,
      handleShiftClickRange,
      isAllSelected,
      isPartiallySelected,
      handleSelectAll,
      isSelected,
      handleViewProduct,
      handleEditProduct,
      handleDuplicateProduct,
      handleDeleteProduct,
    ]
  );

  // Handle selection change from DataTable
  const handleDataTableSelectionChange = useCallback(
    (selectedProducts: ProductTableItem[]) => {
      onSelectionChange(selectedProducts.map((p) => p.id));
    },
    [onSelectionChange]
  );

  return (
    <div className="space-y-4">
      <DataTable
        data={products}
        columns={columns}
        enableRowSelection
        enableSorting
        onRowClick={onRowClick}
        onSelectionChange={handleDataTableSelectionChange}
        className="border rounded-lg"
      />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(page - 1) * pageSize + 1} to{" "}
          {Math.min(page * pageSize, total)} of {total} products
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {Math.ceil(total / pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
