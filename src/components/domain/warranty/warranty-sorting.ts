import {
  createServerSortManifest,
} from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'

export type WarrantySortField = 'createdAt' | 'expiryDate' | 'status'

export const WARRANTY_SORT_FIELDS = [
  'createdAt',
  'expiryDate',
  'status',
] as const satisfies readonly WarrantySortField[]

export const warrantySortManifest = createServerSortManifest<WarrantySortField>({
  fields: WARRANTY_SORT_FIELDS,
  defaultField: 'expiryDate',
  getDefaultDirection: (field) => (field === 'createdAt' ? 'desc' : 'asc'),
})

export const DEFAULT_WARRANTY_SORT_FIELD = warrantySortManifest.defaultField
export const DEFAULT_WARRANTY_SORT_DIRECTION = warrantySortManifest.defaultDirection

export const isValidWarrantySortField = warrantySortManifest.isField
export const getDefaultWarrantySortDirection = warrantySortManifest.getDefaultDirection

export function resolveWarrantySortState(
  currentField: WarrantySortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: WarrantySortField; direction: SortDirection } | null {
  return warrantySortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
