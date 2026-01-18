/**
 * DataTable Components
 *
 * Reusable data table with TanStack Table for sorting, filtering,
 * pagination, and row selection.
 *
 * @example
 * ```tsx
 * import { DataTable, currencyColumn, statusColumn } from '~/components/shared/data-table'
 *
 * <DataTable
 *   data={customers}
 *   columns={columns}
 *   pagination={{ pageSize: 20 }}
 * />
 * ```
 */

// Core components
export { DataTable, type DataTableProps } from "./data-table"
export { DataTablePagination } from "./data-table-pagination"

// Column presets
export {
  checkboxColumn,
  currencyColumn,
  dateColumn,
  statusColumn,
  entityLinkColumn,
  actionsColumn,
  type StatusConfig,
  type ActionItem,
} from "./column-presets"

// Memoized cell components
export {
  PriceCell,
  StatusCell,
  TypeCell,
  DateCell,
  SkuCell,
  NameCell,
  type PriceCellProps,
  type StatusCellProps,
  type StatusConfigItem,
  type TypeCellProps,
  type TypeConfigItem,
  type DateCellProps,
  type SkuCellProps,
  type NameCellProps,
} from "./cells"
