import { createServerSortManifest } from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'
import {
  SUPPLIER_SORT_FIELDS,
  type SupplierSortField,
} from '@/lib/schemas/suppliers'

export const supplierSortManifest = createServerSortManifest<SupplierSortField>({
  fields: SUPPLIER_SORT_FIELDS,
  defaultField: 'name',
  getDefaultDirection: (field) =>
    ['overallRating', 'totalPurchaseOrders', 'leadTimeDays', 'createdAt', 'lastOrderDate'].includes(field)
      ? 'desc'
      : 'asc',
})

export const DEFAULT_SUPPLIER_SORT_FIELD = supplierSortManifest.defaultField
export const DEFAULT_SUPPLIER_SORT_DIRECTION = supplierSortManifest.defaultDirection

export const isValidSupplierSortField = supplierSortManifest.isField
export const getDefaultSupplierSortDirection = supplierSortManifest.getDefaultDirection

export function resolveSupplierSortState(
  currentField: SupplierSortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: SupplierSortField; direction: SortDirection } | null {
  return supplierSortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
