import { createServerSortManifest } from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'
import {
  OPPORTUNITY_SORT_FIELDS,
  type OpportunitySortField,
} from '@/lib/schemas/pipeline'

export const opportunitySortManifest = createServerSortManifest<OpportunitySortField>({
  fields: OPPORTUNITY_SORT_FIELDS,
  defaultField: 'createdAt',
  getDefaultDirection: (field) =>
    ['value', 'probability', 'expectedCloseDate', 'daysInStage', 'createdAt'].includes(field)
      ? 'desc'
      : 'asc',
})

export const DEFAULT_OPPORTUNITY_SORT_FIELD = opportunitySortManifest.defaultField
export const DEFAULT_OPPORTUNITY_SORT_DIRECTION = opportunitySortManifest.defaultDirection

export const isValidOpportunitySortField = opportunitySortManifest.isField
export const getDefaultOpportunitySortDirection = opportunitySortManifest.getDefaultDirection

export function resolveOpportunitySortState(
  currentField: OpportunitySortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: OpportunitySortField; direction: SortDirection } | null {
  return opportunitySortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
