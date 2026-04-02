import {
  createServerSortManifest,
} from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'

export type OrderSortField =
  | "orderNumber"
  | "customer"
  | "orderDate"
  | "status"
  | "total"
  | "createdAt";

export const ORDER_SORT_FIELDS = [
  "orderNumber",
  "customer",
  "orderDate",
  "status",
  "total",
  "createdAt",
] as const satisfies readonly OrderSortField[];

export const orderSortManifest = createServerSortManifest<OrderSortField>({
  fields: ORDER_SORT_FIELDS,
  defaultField: "createdAt",
  getDefaultDirection: (field) =>
    ["orderDate", "total", "createdAt"].includes(field) ? "desc" : "asc",
})

export const DEFAULT_ORDER_SORT_FIELD = orderSortManifest.defaultField;
export const DEFAULT_ORDER_SORT_DIRECTION = orderSortManifest.defaultDirection;

export const isValidOrderSortField = orderSortManifest.isField
export const getDefaultOrderSortDirection = orderSortManifest.getDefaultDirection

export function resolveOrderSortState(
  currentField: OrderSortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: OrderSortField; direction: SortDirection } | null {
  return orderSortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
