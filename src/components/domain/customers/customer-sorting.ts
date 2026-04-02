import {
  createServerSortManifest,
} from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'

export type CustomerSortField =
  | "name"
  | "status"
  | "lifetimeValue"
  | "totalOrders"
  | "healthScore"
  | "lastOrderDate"
  | "createdAt";

export const CUSTOMER_SORT_FIELDS = [
  "name",
  "status",
  "lifetimeValue",
  "totalOrders",
  "healthScore",
  "lastOrderDate",
  "createdAt",
] as const satisfies readonly CustomerSortField[];

export const customerSortManifest = createServerSortManifest<CustomerSortField>({
  fields: CUSTOMER_SORT_FIELDS,
  defaultField: "createdAt",
  getDefaultDirection: (field) =>
    [
      "lifetimeValue",
      "totalOrders",
      "healthScore",
      "lastOrderDate",
      "createdAt",
    ].includes(field)
      ? "desc"
      : "asc",
})

export const DEFAULT_CUSTOMER_SORT_FIELD = customerSortManifest.defaultField;
export const DEFAULT_CUSTOMER_SORT_DIRECTION = customerSortManifest.defaultDirection;

export const isValidCustomerSortField = customerSortManifest.isField
export const getDefaultCustomerSortDirection = customerSortManifest.getDefaultDirection

export function resolveCustomerSortState(
  currentField: CustomerSortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: CustomerSortField; direction: SortDirection } | null {
  return customerSortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
