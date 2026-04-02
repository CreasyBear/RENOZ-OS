import { describe, expect, it } from 'vitest'
import { warrantyFiltersSchema } from '@/lib/schemas/warranty/warranties'
import {
  DEFAULT_WARRANTY_SORT_DIRECTION,
  DEFAULT_WARRANTY_SORT_FIELD,
  WARRANTY_SORT_FIELDS,
  getDefaultWarrantySortDirection,
  resolveWarrantySortState,
} from '@/components/domain/warranty/warranty-sorting'
import {
  DEFAULT_WARRANTY_CLAIM_SORT_DIRECTION,
  DEFAULT_WARRANTY_CLAIM_SORT_FIELD,
  WARRANTY_CLAIM_SORT_FIELDS,
  getDefaultWarrantyClaimSortDirection,
  resolveWarrantyClaimSortState,
} from '@/components/domain/warranty/warranty-claim-sorting'
import { listWarrantyClaimsSchema } from '@/lib/schemas/warranty/claims'

describe('warranty sorting contracts', () => {
  it('matches the warranty list schema', () => {
    expect(warrantyFiltersSchema.safeParse({ sortBy: 'expiryDate' }).success).toBe(true)
    expect(warrantyFiltersSchema.safeParse({ sortBy: 'warrantyNumber' }).success).toBe(false)
    expect(WARRANTY_SORT_FIELDS).toEqual(['createdAt', 'expiryDate', 'status'])
    expect(DEFAULT_WARRANTY_SORT_FIELD).toBe('expiryDate')
    expect(DEFAULT_WARRANTY_SORT_DIRECTION).toBe('asc')
  })

  it('resolves warranty list sort transitions with field defaults', () => {
    expect(getDefaultWarrantySortDirection('createdAt')).toBe('desc')
    expect(getDefaultWarrantySortDirection('status')).toBe('asc')
    expect(
      resolveWarrantySortState('expiryDate', 'asc', 'status')
    ).toEqual({
      field: 'status',
      direction: 'asc',
    })
  })
})

describe('warranty claim sorting contracts', () => {
  it('matches the claim list schema', () => {
    expect(listWarrantyClaimsSchema.safeParse({ sortBy: 'claimNumber' }).success).toBe(true)
    expect(listWarrantyClaimsSchema.safeParse({ sortBy: 'customerName' }).success).toBe(false)
    expect(WARRANTY_CLAIM_SORT_FIELDS).toEqual([
      'submittedAt',
      'claimNumber',
      'status',
      'claimType',
    ])
    expect(DEFAULT_WARRANTY_CLAIM_SORT_FIELD).toBe('submittedAt')
    expect(DEFAULT_WARRANTY_CLAIM_SORT_DIRECTION).toBe('desc')
  })

  it('preserves explicit claim sort direction changes', () => {
    expect(getDefaultWarrantyClaimSortDirection('submittedAt')).toBe('desc')
    expect(getDefaultWarrantyClaimSortDirection('claimType')).toBe('asc')
    expect(
      resolveWarrantyClaimSortState('submittedAt', 'desc', 'claimNumber', 'asc')
    ).toEqual({
      field: 'claimNumber',
      direction: 'asc',
    })
  })
})
