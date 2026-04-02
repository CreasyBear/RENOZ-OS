import { createServerSortManifest } from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'
import {
  CREDIT_NOTE_SORT_FIELDS,
  type CreditNoteSortField,
} from '@/lib/schemas/financial/credit-notes'

export const creditNoteSortManifest = createServerSortManifest<CreditNoteSortField>({
  fields: CREDIT_NOTE_SORT_FIELDS,
  defaultField: 'createdAt',
  getDefaultDirection: (field) =>
    ['createdAt', 'amount'].includes(field) ? 'desc' : 'asc',
})

export const DEFAULT_CREDIT_NOTE_SORT_FIELD = creditNoteSortManifest.defaultField
export const DEFAULT_CREDIT_NOTE_SORT_DIRECTION = creditNoteSortManifest.defaultDirection

export const isValidCreditNoteSortField = creditNoteSortManifest.isField
export const getDefaultCreditNoteSortDirection = creditNoteSortManifest.getDefaultDirection

export function resolveCreditNoteSortState(
  currentField: CreditNoteSortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: CreditNoteSortField; direction: SortDirection } | null {
  return creditNoteSortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
