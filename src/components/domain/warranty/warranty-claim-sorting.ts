import {
  createServerSortManifest,
} from '@/components/shared/data-table/server-sort-manifest'
export type { SortDirection } from '@/components/shared/data-table/server-sorting'
import type { SortDirection } from '@/components/shared/data-table/server-sorting'

export type WarrantyClaimSortField =
  | 'submittedAt'
  | 'claimNumber'
  | 'status'
  | 'claimType'

export const WARRANTY_CLAIM_SORT_FIELDS = [
  'submittedAt',
  'claimNumber',
  'status',
  'claimType',
] as const satisfies readonly WarrantyClaimSortField[]

export const warrantyClaimSortManifest =
  createServerSortManifest<WarrantyClaimSortField>({
    fields: WARRANTY_CLAIM_SORT_FIELDS,
    defaultField: 'submittedAt',
    getDefaultDirection: (field) =>
      field === 'submittedAt' ? 'desc' : 'asc',
  })

export const DEFAULT_WARRANTY_CLAIM_SORT_FIELD =
  warrantyClaimSortManifest.defaultField
export const DEFAULT_WARRANTY_CLAIM_SORT_DIRECTION =
  warrantyClaimSortManifest.defaultDirection

export const isValidWarrantyClaimSortField = warrantyClaimSortManifest.isField
export const getDefaultWarrantyClaimSortDirection =
  warrantyClaimSortManifest.getDefaultDirection

export function resolveWarrantyClaimSortState(
  currentField: WarrantyClaimSortField,
  currentDirection: SortDirection,
  nextField: string,
  nextDirection?: SortDirection
): { field: WarrantyClaimSortField; direction: SortDirection } | null {
  return warrantyClaimSortManifest.resolveSort(
    currentField,
    currentDirection,
    nextField,
    nextDirection
  )
}
