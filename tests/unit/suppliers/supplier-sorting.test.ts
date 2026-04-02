import { describe, expect, it } from 'vitest'
import {
  listSuppliersSchema,
  SUPPLIER_SORT_FIELDS,
} from '@/lib/schemas/suppliers'
import {
  getDefaultSupplierSortDirection,
  resolveSupplierSortState,
} from '@/components/domain/suppliers/supplier-sorting'

describe('supplier sorting helpers', () => {
  it('matches the schema-backed sort contract', () => {
    expect(listSuppliersSchema.safeParse({ sortBy: 'leadTimeDays' }).success).toBe(true)
    expect(listSuppliersSchema.safeParse({ sortBy: 'lifetimeValue' }).success).toBe(false)
    expect(SUPPLIER_SORT_FIELDS).toContain('totalPurchaseOrders')
  })

  it('defaults metrics and recency fields to descending order', () => {
    expect(getDefaultSupplierSortDirection('overallRating')).toBe('desc')
    expect(getDefaultSupplierSortDirection('totalPurchaseOrders')).toBe('desc')
    expect(getDefaultSupplierSortDirection('createdAt')).toBe('desc')
    expect(getDefaultSupplierSortDirection('name')).toBe('asc')
  })

  it('preserves explicit direction changes', () => {
    expect(
      resolveSupplierSortState('name', 'asc', 'status', 'desc')
    ).toEqual({
      field: 'status',
      direction: 'desc',
    })
  })
})
