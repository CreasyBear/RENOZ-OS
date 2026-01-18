/**
 * DataTable Column Presets
 *
 * Reusable column definitions for common data types.
 * Reduces boilerplate when creating DataTable columns.
 *
 * @example
 * ```tsx
 * import { currencyColumn, dateColumn, statusColumn, actionsColumn } from '~/components/shared/data-table'
 *
 * const columns = [
 *   checkboxColumn(),
 *   entityLinkColumn('name', 'Customer', (row) => `/customers/${row.id}`),
 *   currencyColumn('totalAmount', 'Amount'),
 *   dateColumn('createdAt', 'Created'),
 *   statusColumn('status', 'Status', customerStatusMap),
 *   actionsColumn([
 *     { label: 'Edit', onClick: (row) => edit(row) },
 *     { label: 'Delete', onClick: (row) => delete(row), variant: 'destructive' },
 *   ]),
 * ]
 * ```
 */
import type { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "~/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Button } from "~/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { cn } from "~/lib/utils"
import { FormatAmount } from "../format/format-amount"

// ============================================================================
// TYPES
// ============================================================================

export interface StatusConfig {
  label: string
  variant: "success" | "warning" | "error" | "info" | "default"
}

export interface ActionItem<TData> {
  label: string
  onClick: (row: TData) => void
  variant?: "default" | "destructive"
  disabled?: boolean | ((row: TData) => boolean)
}

type AccessorFn<TData, TValue> = (row: TData) => TValue

// ============================================================================
// CHECKBOX COLUMN
// ============================================================================

/**
 * Checkbox column for row selection.
 *
 * @example
 * ```tsx
 * const columns = [checkboxColumn(), ...otherColumns]
 * ```
 */
export function checkboxColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }
}

// ============================================================================
// CURRENCY COLUMN
// ============================================================================

/**
 * Currency column with formatting.
 *
 * @param accessor - Field name or accessor function
 * @param header - Column header text
 * @param options - Formatting options (colorCode, cents, currency)
 */
export function currencyColumn<TData>(
  accessor: keyof TData | AccessorFn<TData, number | string | null | undefined>,
  header = "Amount",
  options: {
    colorCode?: boolean;
    cents?: boolean;
    currency?: "AUD" | "USD" | "EUR" | "GBP";
  } = {}
): ColumnDef<TData> {
  const { colorCode = false, cents = false, currency = "AUD" } = options

  return {
    id: typeof accessor === "string" ? accessor : "currency",
    accessorFn: typeof accessor === "function" ? accessor : (row) => row[accessor],
    header,
    cell: ({ getValue }) => {
      const value = getValue() as number | string | null | undefined
      if (value == null) return <FormatAmount amount={null} cents={cents} />
      const num = typeof value === "string" ? parseFloat(value) : value
      if (isNaN(num)) return <FormatAmount amount={null} cents={cents} />
      return (
        <FormatAmount
          amount={num}
          cents={cents}
          colorCode={colorCode}
          currency={currency}
          className="font-mono"
        />
      )
    },
  }
}

// ============================================================================
// DATE COLUMN
// ============================================================================

/**
 * Date column with formatting.
 *
 * @param accessor - Field name or accessor function
 * @param header - Column header text
 * @param format - Date format options
 */
export function dateColumn<TData>(
  accessor: keyof TData | AccessorFn<TData, Date | string | null | undefined>,
  header = "Date",
  format: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): ColumnDef<TData> {
  const formatter = new Intl.DateTimeFormat("en-AU", format)

  return {
    id: typeof accessor === "string" ? accessor : "date",
    accessorFn: typeof accessor === "function" ? accessor : (row) => row[accessor],
    header,
    cell: ({ getValue }) => {
      const value = getValue() as Date | string | null | undefined
      if (!value) return <span className="text-muted-foreground">—</span>
      const date = value instanceof Date ? value : new Date(value)
      if (isNaN(date.getTime()))
        return <span className="text-muted-foreground">—</span>
      return <span>{formatter.format(date)}</span>
    },
  }
}

// ============================================================================
// STATUS COLUMN
// ============================================================================

const VARIANT_CLASSES = {
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  warning:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

/**
 * Status column with badge display.
 *
 * @param accessor - Field name or accessor function
 * @param header - Column header text
 * @param statusMap - Map of status values to display config
 */
export function statusColumn<TData>(
  accessor: keyof TData | AccessorFn<TData, string | null | undefined>,
  header = "Status",
  statusMap: Record<string, StatusConfig> = {}
): ColumnDef<TData> {
  return {
    id: typeof accessor === "string" ? accessor : "status",
    accessorFn: typeof accessor === "function" ? accessor : (row) => row[accessor],
    header,
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined
      if (!value) return <span className="text-muted-foreground">—</span>

      const config = statusMap[value] ?? {
        label: value,
        variant: "default" as const,
      }

      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            VARIANT_CLASSES[config.variant]
          )}
        >
          {config.label}
        </span>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  }
}

// ============================================================================
// ENTITY LINK COLUMN
// ============================================================================

/**
 * Entity link column for clickable navigation.
 *
 * @param accessor - Field name or accessor function
 * @param header - Column header text
 * @param getHref - Function to generate link URL
 */
export function entityLinkColumn<TData>(
  accessor: keyof TData | AccessorFn<TData, string | null | undefined>,
  header: string,
  getHref: (row: TData) => string
): ColumnDef<TData> {
  return {
    id: typeof accessor === "string" ? accessor : "link",
    accessorFn: typeof accessor === "function" ? accessor : (row) => row[accessor],
    header,
    cell: ({ getValue, row }) => {
      const value = getValue() as string | null | undefined
      if (!value) return <span className="text-muted-foreground">—</span>

      return (
        <a
          href={getHref(row.original)}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      )
    },
  }
}

// ============================================================================
// ACTIONS COLUMN
// ============================================================================

/**
 * Actions column with dropdown menu.
 *
 * @param actions - Array of action items
 */
export function actionsColumn<TData>(
  actions: ActionItem<TData>[]
): ColumnDef<TData> {
  return {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const rowData = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((action, index) => {
              const isDisabled =
                typeof action.disabled === "function"
                  ? action.disabled(rowData)
                  : action.disabled

              return (
                <DropdownMenuItem
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    action.onClick(rowData)
                  }}
                  disabled={isDisabled}
                  className={cn(
                    action.variant === "destructive" && "text-destructive"
                  )}
                >
                  {action.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    enableSorting: false,
    enableHiding: false,
  }
}
