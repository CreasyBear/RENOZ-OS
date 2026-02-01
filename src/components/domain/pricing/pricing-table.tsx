/**
 * Pricing Table Component
 *
 * Data table for displaying supplier price lists with sorting.
 * Shows price, quantity tiers, discounts, and validity periods.
 *
 * @see SUPP-PRICING-MANAGEMENT story
 */

import { useMemo, useCallback } from "react";
import { DataTable, DataTableSkeleton, useTableSelection } from "@/components/shared/data-table";
import { Package } from "lucide-react";
import { useOrgFormat } from "@/hooks/use-org-format";
import { createPricingColumns, type PricingTableItem } from "./pricing-columns";
import type { PriceListRow } from "@/lib/schemas/pricing";

// ============================================================================
// TYPES
// ============================================================================

interface PricingTableProps {
  items: PriceListRow[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSetPreferred?: (id: string, preferred: boolean) => void;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function TableSkeleton() {
  return (
    <DataTableSkeleton
      rows={5}
      columns={[
        { skeleton: { type: "checkbox" }, className: "w-12" },
        { skeleton: { type: "icon-text", width: "w-40" }, className: "w-[200px]" },
        { skeleton: { type: "text", width: "w-32" }, className: "w-[150px]" },
        { skeleton: { type: "text", width: "w-20" }, className: "w-[100px]" },
        { skeleton: { type: "text", width: "w-16" }, className: "w-[90px]" },
        { skeleton: { type: "badge", width: "w-14" }, className: "w-[90px]" },
        { skeleton: { type: "text", width: "w-24" }, className: "w-[130px]" },
        { skeleton: { type: "badge", width: "w-16" }, className: "w-[100px]" },
        { skeleton: { type: "actions" }, className: "w-12" },
      ]}
    />
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="text-muted-foreground mb-3 h-12 w-12" />
      <p className="font-medium">No Price Lists Found</p>
      <p className="text-muted-foreground text-sm">
        Add supplier pricing to start tracking costs.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PricingTable({
  items,
  isLoading = false,
  onEdit,
  onDelete,
  onSetPreferred,
}: PricingTableProps) {
  const { formatCurrency } = useOrgFormat();

  // Format currency with org settings
  const formatCurrencyDisplay = useCallback(
    (amount: number) => formatCurrency(amount, { cents: false, showCents: true }),
    [formatCurrency]
  );

  // Selection state - cast items to have `id` property
  const itemsWithId = items as (PriceListRow & { id: string })[];

  const {
    isSelected,
    isAllSelected,
    isPartiallySelected,
    handleSelect,
    handleSelectAll,
    handleShiftClickRange,
    lastClickedIndex,
    setLastClickedIndex,
  } = useTableSelection({
    items: itemsWithId,
  });

  // Handle single selection with index tracking
  const onSelect = useCallback(
    (id: string, checked: boolean) => {
      handleSelect(id, checked);
    },
    [handleSelect]
  );

  // Handle select all
  const onSelectAll = useCallback(
    (checked: boolean) => {
      handleSelectAll(checked);
    },
    [handleSelectAll]
  );

  // Handle shift-click range selection
  const onShiftClickRange = useCallback(
    (rowIndex: number) => {
      if (lastClickedIndex !== null) {
        handleShiftClickRange(lastClickedIndex, rowIndex);
      }
      setLastClickedIndex(rowIndex);
    },
    [lastClickedIndex, handleShiftClickRange, setLastClickedIndex]
  );

  // Create columns with handlers
  const columns = useMemo(
    () =>
      createPricingColumns({
        onSelect: (id, checked) => {
          onSelect(id, checked);
          // Find index for this item
          const idx = itemsWithId.findIndex((item) => item.id === id);
          if (idx >= 0) {
            setLastClickedIndex(idx);
          }
        },
        onShiftClickRange,
        isAllSelected,
        isPartiallySelected,
        onSelectAll,
        isSelected,
        onEdit,
        onDelete,
        onSetPreferred,
        formatCurrency: formatCurrencyDisplay,
      }),
    [
      onSelect,
      onShiftClickRange,
      isAllSelected,
      isPartiallySelected,
      onSelectAll,
      isSelected,
      onEdit,
      onDelete,
      onSetPreferred,
      formatCurrencyDisplay,
      itemsWithId,
      setLastClickedIndex,
    ]
  );

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <DataTable
      data={items as PricingTableItem[]}
      columns={columns}
      enableSorting
      pagination={{ pageSize: 20 }}
      emptyMessage="No price lists found."
    />
  );
}

export { PricingTable };
export type { PricingTableProps, PriceListRow };
