import {
  createServerSortManifest,
} from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'

export type KbArticleSortField =
  | 'updatedAt'
  | 'createdAt'
  | 'title'
  | 'viewCount'
  | 'publishedAt'

export const KB_ARTICLE_SORT_FIELDS = [
  'updatedAt',
  'createdAt',
  'title',
  'viewCount',
  'publishedAt',
] as const satisfies readonly KbArticleSortField[]

export const kbArticleSortManifest =
  createServerSortManifest<KbArticleSortField>({
    fields: KB_ARTICLE_SORT_FIELDS,
    defaultField: 'updatedAt',
    getDefaultDirection: (field) =>
      field === 'title' ? 'asc' : 'desc',
  })

export const DEFAULT_KB_ARTICLE_SORT_FIELD = kbArticleSortManifest.defaultField
export const DEFAULT_KB_ARTICLE_SORT_DIRECTION =
  kbArticleSortManifest.defaultDirection

export const isValidKbArticleSortField = kbArticleSortManifest.isField
export const getDefaultKbArticleSortDirection =
  kbArticleSortManifest.getDefaultDirection

export function resolveKbArticleSortState(
  currentField: KbArticleSortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: KbArticleSortField; direction: SortDirection } | null {
  return kbArticleSortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
