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
import { useState, useMemo, useCallback } from "react"
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
  /** Enable column filtering */
  enableFiltering?: boolean
  /** Callback when row is clicked */
  onRowClick?: (row: TData) => void
  /** Callback when selection changes */
  onSelectionChange?: (selectedRows: TData[]) => void
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
  enableFiltering = false,
  onRowClick,
  onSelectionChange,
  globalFilter,
  onGlobalFilterChange,
  className,
  isLoading,
  emptyMessage = "No results found.",
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Memoize table options for performance
  const tableOptions = useMemo(
    () => ({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
      getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
      onSortingChange: enableSorting ? setSorting : undefined,
      onColumnFiltersChange: enableFiltering ? setColumnFilters : undefined,
      onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
      onGlobalFilterChange: enableFiltering ? onGlobalFilterChange : undefined,
      enableRowSelection,
      state: {
        sorting,
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
      enableFiltering,
      enableRowSelection,
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
      onGlobalFilterChange,
      pagination,
    ]
  )

  const table = useReactTable(tableOptions)

  // Handle selection changes
  const handleSelectionChange = useCallback(
    (selection: RowSelectionState) => {
      setRowSelection(selection)
      if (onSelectionChange) {
        const selectedRows = table
          .getSelectedRowModel()
          .rows.map((row) => row.original)
        onSelectionChange(selectedRows)
      }
    },
    [table, onSelectionChange]
  )

  // Update selection callback
  if (enableRowSelection && rowSelection !== table.getState().rowSelection) {
    handleSelectionChange(table.getState().rowSelection)
  }

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
