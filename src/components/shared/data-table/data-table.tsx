/**
 * DataTable Component
 *
 * Reusable data table using TanStack Table with built-in pagination,
 * sorting, filtering, and row selection.
 *
 * Performance: Targets <100ms render for 100 rows.
 *
 * @example
 * ```tsx
 * <DataTable
 *   data={customers}
 *   columns={columns}
 *   pagination={{ pageSize: 20 }}
 *   onRowClick={(row) => navigate(`/customers/${row.id}`)}
 * />
 * ```
 */
import { useState, useMemo, useCallback, useEffect } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type Row,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { DataTablePagination } from "./data-table-pagination"
import { cn } from "~/lib/utils"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

export interface DataTableProps<TData> {
  /** Data array to display */
  data: TData[]
  /** Column definitions */
  columns: ColumnDef<TData>[]
  /** Pagination options */
  pagination?: {
    pageSize?: number
    pageIndex?: number
  }
  /** Enable row selection */
  enableRowSelection?: boolean
  /** Enable column sorting */
  enableSorting?: boolean
  /** Use server-side/manual sorting instead of client-side row sorting */
  manualSorting?: boolean
  /** Enable column filtering */
  enableFiltering?: boolean
  /** Callback when row is clicked */
  onRowClick?: (row: TData) => void
  /** Callback when selection changes */
  onSelectionChange?: (selectedRows: TData[]) => void
  /** Controlled sorting state for server/manual sorting */
  sorting?: {
    field: string
    direction: "asc" | "desc"
  }
  /** Callback when sorting changes */
  onSortChange?: (field: string, direction: "asc" | "desc") => void
  /** Global filter value */
  globalFilter?: string
  /** Callback when global filter changes */
  onGlobalFilterChange?: (value: string) => void
  /** Additional class names */
  className?: string
  /** Loading state */
  isLoading?: boolean
  /** Empty state message */
  emptyMessage?: string
}

export function DataTable<TData>({
  data,
  columns,
  pagination,
  enableRowSelection = false,
  enableSorting = true,
  manualSorting = false,
  enableFiltering = false,
  onRowClick,
  onSelectionChange,
  sorting,
  onSortChange,
  globalFilter,
  onGlobalFilterChange,
  className,
  isLoading,
  emptyMessage = "No results found.",
}: DataTableProps<TData>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const tableSorting = useMemo<SortingState>(
    () =>
      sorting
        ? [{ id: sorting.field, desc: sorting.direction === "desc" }]
        : internalSorting,
    [internalSorting, sorting]
  )

  const handleSortingChange = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const nextSorting =
        typeof updater === "function" ? updater(tableSorting) : updater

      if (!sorting) {
        setInternalSorting(nextSorting)
      }

      if (onSortChange && nextSorting.length > 0) {
        const nextSort = nextSorting[0]
        onSortChange(nextSort.id, nextSort.desc ? "desc" : "asc")
      }
    },
    [onSortChange, sorting, tableSorting]
  )

  // Memoize table options for performance
  const tableOptions = useMemo(
    () => ({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel:
        enableSorting && !manualSorting ? getSortedRowModel() : undefined,
      getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
      onSortingChange: enableSorting ? handleSortingChange : undefined,
      onColumnFiltersChange: enableFiltering ? setColumnFilters : undefined,
      onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
      onGlobalFilterChange: enableFiltering ? onGlobalFilterChange : undefined,
      enableRowSelection,
      manualSorting,
      state: {
        sorting: tableSorting,
        columnFilters,
        rowSelection,
        globalFilter,
      },
      initialState: {
        pagination: {
          pageSize: pagination?.pageSize ?? 20,
          pageIndex: pagination?.pageIndex ?? 0,
        },
      },
    }),
    [
      data,
      columns,
      enableSorting,
      manualSorting,
      enableFiltering,
      enableRowSelection,
      tableSorting,
      columnFilters,
      rowSelection,
      globalFilter,
      onGlobalFilterChange,
      handleSortingChange,
      pagination,
    ]
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable returns functions that cannot be memoized; known TanStack Table limitation
  const table = useReactTable(tableOptions)

  useEffect(() => {
    if (!enableRowSelection || !onSelectionChange) {
      return
    }

    const selectedRows = table
      .getSelectedRowModel()
      .rows.map((row) => row.original)

    onSelectionChange(selectedRows)
  }, [enableRowSelection, onSelectionChange, rowSelection, table])

  const handleRowClick = useCallback(
    (row: Row<TData>) => {
      if (onRowClick) {
        onRowClick(row.original)
      }
    },
    [onRowClick]
  )

  const getSortIcon = (isSorted: false | "asc" | "desc") => {
    if (isSorted === "asc") return <ArrowUp className="ml-2 h-4 w-4" />
    if (isSorted === "desc") return <ArrowDown className="ml-2 h-4 w-4" />
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-md border" role="table">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} role="row">
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted()
                  const canSort = header.column.getCanSort()

                  return (
                    <TableHead
                      key={header.id}
                      role="columnheader"
                      aria-sort={
                        isSorted === "asc"
                          ? "ascending"
                          : isSorted === "desc"
                            ? "descending"
                            : undefined
                      }
                      className={cn(
                        canSort && "cursor-pointer select-none transition-colors duration-150 hover:bg-muted/30"
                      )}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                      onKeyDown={
                        canSort
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                header.column.toggleSorting()
                              }
                            }
                          : undefined
                      }
                      tabIndex={canSort ? 0 : undefined}
                    >
                      <div className="flex items-center">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {canSort && getSortIcon(isSorted)}
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  role="row"
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    onRowClick && "cursor-pointer transition-colors duration-200 hover:bg-muted/50"
                  )}
                  onClick={() => handleRowClick(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && onRowClick) {
                      handleRowClick(row)
                    }
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} role="cell">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  )
}
