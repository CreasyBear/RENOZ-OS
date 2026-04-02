import {
  createServerSortManifest,
} from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'

export type RmaSortField = 'createdAt' | 'rmaNumber' | 'status'

export const RMA_SORT_FIELDS = [
  'createdAt',
  'rmaNumber',
  'status',
] as const satisfies readonly RmaSortField[]

export const rmaSortManifest = createServerSortManifest<RmaSortField>({
  fields: RMA_SORT_FIELDS,
  defaultField: 'createdAt',
  getDefaultDirection: (field) => (field === 'createdAt' ? 'desc' : 'asc'),
})

export const DEFAULT_RMA_SORT_FIELD = rmaSortManifest.defaultField
export const DEFAULT_RMA_SORT_DIRECTION = rmaSortManifest.defaultDirection

export const isValidRmaSortField = rmaSortManifest.isField
export const getDefaultRmaSortDirection = rmaSortManifest.getDefaultDirection

export function resolveRmaSortState(
  currentField: RmaSortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: RmaSortField; direction: SortDirection } | null {
  return rmaSortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
