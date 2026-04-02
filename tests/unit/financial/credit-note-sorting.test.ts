import { describe, expect, it } from 'vitest'
import {
  CREDIT_NOTE_SORT_FIELDS,
  creditNoteListQuerySchema,
} from '@/lib/schemas/financial/credit-notes'
import {
  getDefaultCreditNoteSortDirection,
  resolveCreditNoteSortState,
} from '@/components/domain/financial/credit-note-sorting'

describe('credit note sorting helpers', () => {
  it('matches the schema-backed sort contract', () => {
    expect(CREDIT_NOTE_SORT_FIELDS).toEqual([
      'createdAt',
      'amount',
      'status',
      'customer',
    ])

    expect(
      creditNoteListQuerySchema.safeParse({ sortBy: 'customer' }).success
    ).toBe(true)
    expect(
      creditNoteListQuerySchema.safeParse({ sortBy: 'creditNoteNumber' }).success
    ).toBe(false)
  })

  it('defaults date and amount fields to descending order', () => {
    expect(getDefaultCreditNoteSortDirection('createdAt')).toBe('desc')
    expect(getDefaultCreditNoteSortDirection('amount')).toBe('desc')
    expect(getDefaultCreditNoteSortDirection('status')).toBe('asc')
  })

  it('preserves explicit direction and rejects unsupported fields', () => {
    expect(
      resolveCreditNoteSortState('createdAt', 'desc', 'customer', 'asc')
    ).toEqual({
      field: 'customer',
      direction: 'asc',
    })

    expect(resolveCreditNoteSortState('createdAt', 'desc', 'orderId')).toBeNull()
  })
})
