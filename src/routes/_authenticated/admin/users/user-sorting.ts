import { createServerSortManifest } from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'
import {
  USER_SORT_FIELDS,
  type UserSortField,
} from '@/lib/schemas/auth'

export const userSortManifest = createServerSortManifest<UserSortField>({
  fields: USER_SORT_FIELDS,
  defaultField: 'name',
  getDefaultDirection: (field) => (field === 'createdAt' ? 'desc' : 'asc'),
})

export const DEFAULT_USER_SORT_FIELD = userSortManifest.defaultField
export const DEFAULT_USER_SORT_DIRECTION = userSortManifest.defaultDirection

export const isValidUserSortField = userSortManifest.isField
export const getDefaultUserSortDirection = userSortManifest.getDefaultDirection

export function resolveUserSortState(
  currentField: UserSortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: UserSortField; direction: SortDirection } | null {
  return userSortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
