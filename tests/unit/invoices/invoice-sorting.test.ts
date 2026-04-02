import { describe, expect, it } from 'vitest'
import {
  INVOICE_SORT_FIELDS,
  invoiceListQuerySchema,
} from '@/lib/schemas/invoices'
import {
  getDefaultInvoiceSortDirection,
  resolveInvoiceSortState,
} from '@/components/domain/invoices/list/invoice-sorting'

describe('invoice sorting helpers', () => {
  it('matches the schema-backed sort contract', () => {
    expect(INVOICE_SORT_FIELDS).toEqual([
      'createdAt',
      'dueDate',
      'total',
      'invoiceNumber',
      'customer',
    ])

    expect(invoiceListQuerySchema.safeParse({ sortBy: 'customer' }).success).toBe(true)
    expect(invoiceListQuerySchema.safeParse({ sortBy: 'status' }).success).toBe(false)
  })

  it('defaults date and amount sorts to descending order', () => {
    expect(getDefaultInvoiceSortDirection('createdAt')).toBe('desc')
    expect(getDefaultInvoiceSortDirection('dueDate')).toBe('desc')
    expect(getDefaultInvoiceSortDirection('total')).toBe('desc')
  })

  it('resolves sort changes consistently', () => {
    expect(
      resolveInvoiceSortState('createdAt', 'desc', 'invoiceNumber')
    ).toEqual({
      field: 'invoiceNumber',
      direction: 'asc',
    })
  })
})
