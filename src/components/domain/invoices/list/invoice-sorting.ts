import { createServerSortManifest } from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'
import {
  INVOICE_SORT_FIELDS,
  type InvoiceSortField,
} from '@/lib/schemas/invoices'

export const invoiceSortManifest = createServerSortManifest<InvoiceSortField>({
  fields: INVOICE_SORT_FIELDS,
  defaultField: 'createdAt',
  getDefaultDirection: (field) =>
    ['createdAt', 'dueDate', 'total'].includes(field) ? 'desc' : 'asc',
})

export const DEFAULT_INVOICE_SORT_FIELD = invoiceSortManifest.defaultField
export const DEFAULT_INVOICE_SORT_DIRECTION = invoiceSortManifest.defaultDirection

export const isValidInvoiceSortField = invoiceSortManifest.isField
export const getDefaultInvoiceSortDirection = invoiceSortManifest.getDefaultDirection

export function resolveInvoiceSortState(
  currentField: InvoiceSortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: InvoiceSortField; direction: SortDirection } | null {
  return invoiceSortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
