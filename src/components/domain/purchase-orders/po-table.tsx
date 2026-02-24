/**
 * Purchase Order Table Component
 *
 * Data table displaying purchase orders using TanStack Table with
 * selection support, server-side sorting, and shared cell components.
 *
 * @see TABLE-STANDARDS for pattern documentation
 */

import { memo, useMemo, useState, useCallback, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { Truck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableSkeleton, DataTableEmpty } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";
import type { PurchaseOrderTableData } from "@/lib/schemas/purchase-orders";
import { createPOColumns } from "./po-columns";

// ============================================================================
// TYPES
// ============================================================================
// Server sort fields + client-only (supplierName). Used for client-side table sorting.
const POTABLE_SORT_FIELDS = [
  'poNumber',
  'supplierName',
  'status',
  'orderDate',
  'requiredDate',
  'totalAmount',
] as const;
type POTableSortField = (typeof POTABLE_SORT_FIELDS)[number];
type SortDirection = 'asc' | 'desc';

function isPOTableSortField(field: string): field is POTableSortField {
  return (POTABLE_SORT_FIELDS as readonly string[]).includes(field);
}

export interface POTableProps {
  orders: PurchaseOrderTableData[];
  isLoading?: boolean;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReceive?: (id: string) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const POTable = memo(function POTable({
  orders,
  isLoading = false,
  onView,
  onEdit,
  onDelete,
  onReceive,
}: POTableProps) {
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIndexRef = useRef<number | null>(null);

  // Sort state (client-side for backward compatibility)
  const [sort, setSort] = useState<{ field: POTableSortField; direction: SortDirection }>({
    field: "orderDate",
    direction: "desc",
  });

  // Selection handlers
  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const isAllSelected = useMemo(
    () => orders.length > 0 && selectedIds.size === orders.length,
    [orders.length, selectedIds.size]
  );

  const isPartiallySelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < orders.length,
    [orders.length, selectedIds.size]
  );

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    // Update last selected index
    const index = orders.findIndex((o) => o.id === id);
    if (index !== -1) {
      lastSelectedIndexRef.current = index;
    }
  }, [orders]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [orders]);

  const handleShiftClickRange = useCallback((targetIndex: number) => {
    const lastIndex = lastSelectedIndexRef.current;
    if (lastIndex === null) {
      // No previous selection, just select this one
      const id = orders[targetIndex]?.id;
      if (id) {
        setSelectedIds((prev) => new Set(prev).add(id));
        lastSelectedIndexRef.current = targetIndex;
      }
      return;
    }

    // Select range between last and target
    const start = Math.min(lastIndex, targetIndex);
    const end = Math.max(lastIndex, targetIndex);
    const rangeIds = orders.slice(start, end + 1).map((o) => o.id);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      rangeIds.forEach((id) => next.add(id));
      return next;
    });
    lastSelectedIndexRef.current = targetIndex;
  }, [orders]);

  // Sort orders (client-side)
  const sortedOrders = useMemo(() => {
    const sorted = [...orders];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case "poNumber":
          comparison = a.poNumber.localeCompare(b.poNumber);
          break;
        case "supplierName":
          comparison = (a.supplierName || "").localeCompare(b.supplierName || "");
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "orderDate": {
          const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
          const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
        case "requiredDate": {
          const reqA = a.requiredDate ? new Date(a.requiredDate).getTime() : 0;
          const reqB = b.requiredDate ? new Date(b.requiredDate).getTime() : 0;
          comparison = reqA - reqB;
          break;
        }
        case "totalAmount":
          comparison = a.totalAmount - b.totalAmount;
          break;
        default:
          comparison = 0;
      }
      return sort.direction === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [orders, sort]);

  // Handle sort changes
  const handleSort = useCallback((field: string) => {
    if (!isPOTableSortField(field)) return;
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  // Create columns with handlers
  const columns = useMemo(
    () =>
      createPOColumns({
        onSelect: handleSelect,
        onShiftClickRange: handleShiftClickRange,
        isAllSelected,
        isPartiallySelected,
        onSelectAll: handleSelectAll,
        isSelected,
        onViewPO: onView ?? (() => {}),
        onEditPO: onEdit,
        onDeletePO: onDelete,
        onReceivePO: onReceive,
      }),
    [
      handleSelect,
      handleShiftClickRange,
      isAllSelected,
      isPartiallySelected,
      handleSelectAll,
      isSelected,
      onView,
      onEdit,
      onDelete,
      onReceive,
    ]
  );

  // Convert sort state to TanStack Table sorting state
  const sorting: SortingState = useMemo(
    () => [{ id: sort.field, desc: sort.direction === "desc" }],
    [sort.field, sort.direction]
  );

  // Handle sorting changes
  const handleSortingChange = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater;
      if (newSorting.length > 0) {
        handleSort(newSorting[0].id);
      }
    },
    [sorting, handleSort]
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable returns functions that cannot be memoized; known TanStack Table limitation
  const table = useReactTable({
    data: sortedOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: false, // Client-side sorting for backward compatibility
    state: { sorting },
    onSortingChange: handleSortingChange,
  });

  if (isLoading) {
    return (
      <DataTableSkeleton
        rows={5}
        columns={[
          { skeleton: { type: "checkbox" } },
          { skeleton: { type: "text", width: "w-24" } },
          { skeleton: { type: "text", width: "w-32" } },
          { skeleton: { type: "badge", width: "w-20" } },
          { skeleton: { type: "text", width: "w-24" } },
          { skeleton: { type: "text", width: "w-24" } },
          { skeleton: { type: "text", width: "w-20" } },
          { skeleton: { type: "actions" } },
        ]}
      />
    );
  }

  if (orders.length === 0) {
    return (
      <DataTableEmpty
        icon={Truck}
        title="No purchase orders"
        description="Create your first purchase order to start tracking supplier orders."
      />
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className={cn(
                    header.column.getCanSort() && "cursor-pointer select-none"
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                selectedIds.has(row.original.id) && "bg-muted/50"
              )}
              onClick={() => onView?.(row.original.id)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

POTable.displayName = "POTable";

export type { PurchaseOrderTableData };
