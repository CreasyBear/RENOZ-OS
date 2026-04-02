import { createServerSortManifest } from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'
import {
  PROJECT_SORT_FIELDS,
  type ProjectSortField,
} from '@/lib/schemas/jobs/projects'

export const projectSortManifest = createServerSortManifest<ProjectSortField>({
  fields: PROJECT_SORT_FIELDS,
  defaultField: 'createdAt',
  getDefaultDirection: (field) =>
    ['createdAt', 'targetCompletionDate'].includes(field) ? 'desc' : 'asc',
})

export const DEFAULT_PROJECT_SORT_FIELD = projectSortManifest.defaultField
export const DEFAULT_PROJECT_SORT_DIRECTION = projectSortManifest.defaultDirection

export const isValidProjectSortField = projectSortManifest.isField
export const getDefaultProjectSortDirection = projectSortManifest.getDefaultDirection

export function resolveProjectSortState(
  currentField: ProjectSortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: ProjectSortField; direction: SortDirection } | null {
  return projectSortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
