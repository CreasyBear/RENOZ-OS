/**
 * CustomerTable Component
 *
 * Table component for displaying customer data using TanStack Table.
 * Uses shared column definitions and status configs for consistency.
 *
 * @source customers from getCustomers server function via CustomerDirectory container
 * @see STANDARDS.md Section 2: Component Architecture
 */
import { memo, useMemo, useState, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createCustomerColumns, type CustomerTableData } from "./customer-columns";

// Re-export CustomerTableData for backwards compatibility
export type { CustomerTableData } from "./customer-columns";

// ============================================================================
// TYPES
// ============================================================================

interface CustomerTableProps {
  customers: CustomerTableData[];
  isLoading?: boolean;
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onSort: (column: string) => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onEdit?: (customer: CustomerTableData) => void;
  onDelete?: (customer: CustomerTableData) => void;
}

// Column visibility configuration
type ColumnId =
  | "status"
  | "type"
  | "size"
  | "industry"
  | "contact"
  | "lifetimeValue"
  | "totalOrders"
  | "healthScore"
  | "lastOrderDate";

interface ColumnConfig {
  id: ColumnId;
  label: string;
  defaultVisible: boolean;
}

const COLUMN_CONFIG: ColumnConfig[] = [
  { id: "status", label: "Status", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "size", label: "Size", defaultVisible: true },
  { id: "industry", label: "Industry", defaultVisible: true },
  { id: "contact", label: "Contact", defaultVisible: true },
  { id: "lifetimeValue", label: "LTV", defaultVisible: true },
  { id: "totalOrders", label: "Orders", defaultVisible: true },
  { id: "healthScore", label: "Health", defaultVisible: true },
  { id: "lastOrderDate", label: "Last Order", defaultVisible: true },
];

// ============================================================================
// COLUMN VISIBILITY TOGGLE
// ============================================================================

interface ColumnVisibilityToggleProps {
  columnVisibility: VisibilityState;
  onToggle: (columnId: string) => void;
  onReset: () => void;
  visibleCount: number;
}

const ColumnVisibilityToggle = memo(function ColumnVisibilityToggle({
  columnVisibility,
  onToggle,
  onReset,
  visibleCount,
}: ColumnVisibilityToggleProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Columns</span>
          <span className="bg-primary/10 text-primary rounded-full px-1.5 text-xs min-w-[1.25rem] text-center">
            {visibleCount}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Visible Columns</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-auto py-1 px-2 text-xs"
            >
              Reset
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {COLUMN_CONFIG.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Switch
                  id={`column-${column.id}`}
                  checked={columnVisibility[column.id] !== false}
                  onCheckedChange={() => onToggle(column.id)}
                />
                <Label
                  htmlFor={`column-${column.id}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

ColumnVisibilityToggle.displayName = "ColumnVisibilityToggle";

// ============================================================================
// LOADING SKELETON
// ============================================================================

function TableSkeleton({ columnCount }: { columnCount: number }) {
  return (
    <TableBody>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columnCount }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full max-w-24" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CustomerTable = memo(function CustomerTable({
  customers,
  isLoading = false,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onSort,
  sortColumn = "name",
  sortDirection = "asc",
  onEdit,
  onDelete,
}: CustomerTableProps) {
  // Selection state
  const isAllSelected = customers.length > 0 && selectedIds.size === customers.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < customers.length;

  // Track last selected index for shift-click range selection
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    COLUMN_CONFIG.reduce(
      (acc, col) => ({
        ...acc,
        [col.id]: col.defaultVisible,
      }),
      {} as VisibilityState
    )
  );

  // Check if item is selected
  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  // Handle shift-click range selection
  const handleShiftClickRange = useCallback(
    (rowIndex: number) => {
      if (lastSelectedIndex === null) {
        setLastSelectedIndex(rowIndex);
        return;
      }

      const start = Math.min(lastSelectedIndex, rowIndex);
      const end = Math.max(lastSelectedIndex, rowIndex);

      for (let i = start; i <= end; i++) {
        const customer = customers[i];
        if (customer && !selectedIds.has(customer.id)) {
          onSelectOne(customer.id, true);
        }
      }

      setLastSelectedIndex(rowIndex);
    },
    [lastSelectedIndex, customers, selectedIds, onSelectOne]
  );

  // Wrap onSelectOne to track last selected index
  const handleSelect = useCallback(
    (id: string, checked: boolean) => {
      const index = customers.findIndex((c) => c.id === id);
      if (checked && index !== -1) {
        setLastSelectedIndex(index);
      }
      onSelectOne(id, checked);
    },
    [customers, onSelectOne]
  );

  // View handler - navigate to customer detail
  const handleViewCustomer = useCallback((id: string) => {
    window.location.href = `/customers/${id}`;
  }, []);

  // Edit handler
  const handleEditCustomer = useMemo(() => {
    if (!onEdit) return undefined;
    return (id: string) => {
      const customer = customers.find((c) => c.id === id);
      if (customer) onEdit(customer);
    };
  }, [onEdit, customers]);

  // Delete handler
  const handleDeleteCustomer = useMemo(() => {
    if (!onDelete) return undefined;
    return (id: string) => {
      const customer = customers.find((c) => c.id === id);
      if (customer) onDelete(customer);
    };
  }, [onDelete, customers]);

  // Create columns with selection handlers
  const columns = useMemo(
    () =>
      createCustomerColumns({
        onSelect: handleSelect,
        onShiftClickRange: handleShiftClickRange,
        isAllSelected,
        isPartiallySelected,
        onSelectAll,
        isSelected,
        onViewCustomer: handleViewCustomer,
        onEditCustomer: handleEditCustomer,
        onDeleteCustomer: handleDeleteCustomer,
      }),
    [
      handleSelect,
      handleShiftClickRange,
      isAllSelected,
      isPartiallySelected,
      onSelectAll,
      isSelected,
      handleViewCustomer,
      handleEditCustomer,
      handleDeleteCustomer,
    ]
  );

  // Convert sort state to TanStack Table sorting state
  const sorting: SortingState = useMemo(
    () => [{ id: sortColumn, desc: sortDirection === "desc" }],
    [sortColumn, sortDirection]
  );

  // Handle sort changes (server-side)
  const handleSortingChange = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater;
      if (newSorting.length > 0) {
        onSort(newSorting[0].id);
      }
    },
    [sorting, onSort]
  );

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnId: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnId]: prev[columnId] === false ? true : false,
    }));
  }, []);

  // Reset column visibility
  const resetColumnVisibility = useCallback(() => {
    setColumnVisibility(
      COLUMN_CONFIG.reduce(
        (acc, col) => ({
          ...acc,
          [col.id]: col.defaultVisible,
        }),
        {} as VisibilityState
      )
    );
  }, []);

  // Count visible columns
  const visibleCount = useMemo(
    () =>
      COLUMN_CONFIG.filter((col) => columnVisibility[col.id] !== false).length,
    [columnVisibility]
  );

  // Create TanStack Table instance
  const table = useReactTable({
    data: customers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, // Server-side sorting
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: setColumnVisibility,
  });

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-muted-foreground">
          {selectedIds.size > 0 ? (
            <span className="font-medium text-foreground">{selectedIds.size}</span>
          ) : (
            <span>{customers.length}</span>
          )}{" "}
          {selectedIds.size === 1 ? "customer" : "customers"}
          {selectedIds.size > 0 && " selected"}
        </div>
        <ColumnVisibilityToggle
          columnVisibility={columnVisibility}
          onToggle={toggleColumnVisibility}
          onReset={resetColumnVisibility}
          visibleCount={visibleCount}
        />
      </div>

      <div className="rounded-md border">
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

          {isLoading ? (
            <TableSkeleton columnCount={table.getVisibleFlatColumns().length} />
          ) : (
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleFlatColumns().length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(selectedIds.has(row.original.id) && "bg-muted/50")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          )}
        </Table>
      </div>
    </div>
  );
});

CustomerTable.displayName = "CustomerTable";
