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
export { DataTableColumnHeader, type DataTableColumnHeaderProps } from "./data-table-column-header"

// Skeleton & Empty states
export {
  DataTableSkeleton,
  SkeletonCell,
  type DataTableSkeletonProps,
  type SkeletonCellProps,
  type SkeletonType,
} from "./data-table-skeleton"
export {
  DataTableEmpty,
  DataTableEmptyRow,
  type DataTableEmptyProps,
  type DataTableEmptyRowProps,
  type DataTableEmptyVariant,
} from "./data-table-empty"

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
  GradientStatusCell,
  GRADIENT_STYLES,
  CheckboxCell,
  ActionsCell,
  ScoreCell,
  TagsCell,
  SourceCell,
  SOURCE_CONFIG,
  type PriceCellProps,
  type StatusCellProps,
  type StatusConfigItem,
  type SemanticStatusConfigItem,
  type CombinedStatusConfigItem,
  type TypeCellProps,
  type TypeConfigItem,
  type DateCellProps,
  type SkuCellProps,
  type NameCellProps,
  type GradientStatusCellProps,
  type GradientStyleConfig,
  type GradientVariant,
  type CheckboxCellProps,
  type ActionsCellProps,
  type ActionItem as CellActionItem,
  type ScoreCellProps,
  type TagsCellProps,
  type TagItem,
  type SourceCellProps,
  type SourceType,
} from "./cells"

// Toolbar components
export { DataTableToolbar, type DataTableToolbarProps } from "./data-table-toolbar"
export {
  DataTableFilterDropdown,
  type DataTableFilterDropdownProps,
  type DataTableFilter,
  type DataTableFilterOption,
} from "./data-table-filter-dropdown"
export { DataTableSortDropdown, type DataTableSortDropdownProps } from "./data-table-sort-dropdown"
export { BulkActionsBar, type BulkActionsBarProps } from "./bulk-actions-bar"

// Hooks
export {
  useTableSelection,
  useTableFilters,
  type UseTableSelectionOptions,
  type UseTableSelectionReturn,
  type FilterConfig,
  type UseTableFiltersOptions,
  type FilterState,
  type UseTableFiltersReturn,
} from "./hooks"
