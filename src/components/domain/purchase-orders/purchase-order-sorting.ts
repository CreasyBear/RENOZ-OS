import { createServerSortManifest } from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'
import {
  PO_SORT_FIELDS,
  type PurchaseOrderSortField,
} from '@/lib/schemas/purchase-orders'

export const purchaseOrderSortManifest = createServerSortManifest<PurchaseOrderSortField>({
  fields: PO_SORT_FIELDS,
  defaultField: 'createdAt',
  getDefaultDirection: (field) =>
    ['orderDate', 'requiredDate', 'totalAmount', 'createdAt'].includes(field)
      ? 'desc'
      : 'asc',
})

export const DEFAULT_PURCHASE_ORDER_SORT_FIELD = purchaseOrderSortManifest.defaultField
export const DEFAULT_PURCHASE_ORDER_SORT_DIRECTION = purchaseOrderSortManifest.defaultDirection

export const isValidPurchaseOrderSortField = purchaseOrderSortManifest.isField
export const getDefaultPurchaseOrderSortDirection =
  purchaseOrderSortManifest.getDefaultDirection

export function resolvePurchaseOrderSortState(
  currentField: PurchaseOrderSortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: PurchaseOrderSortField; direction: SortDirection } | null {
  return purchaseOrderSortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
