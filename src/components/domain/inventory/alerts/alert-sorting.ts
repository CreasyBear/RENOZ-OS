import { createServerSortManifest } from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'

export type AlertSortField =
  | 'alertType'
  | 'isActive'
  | 'lastTriggeredAt'
  | 'createdAt'

export const ALERT_SORT_FIELDS = [
  'alertType',
  'isActive',
  'lastTriggeredAt',
  'createdAt',
] as const satisfies readonly AlertSortField[]

export const alertSortManifest = createServerSortManifest<AlertSortField>({
  fields: ALERT_SORT_FIELDS,
  defaultField: 'createdAt',
  getDefaultDirection: (field) =>
    ['lastTriggeredAt', 'createdAt'].includes(field) ? 'desc' : 'asc',
})

export const DEFAULT_ALERT_SORT_FIELD = alertSortManifest.defaultField
export const DEFAULT_ALERT_SORT_DIRECTION = alertSortManifest.defaultDirection

export const isValidAlertSortField = alertSortManifest.isField
export const getDefaultAlertSortDirection = alertSortManifest.getDefaultDirection

export function resolveAlertSortState(
  currentField: AlertSortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: AlertSortField; direction: SortDirection } | null {
  return alertSortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
