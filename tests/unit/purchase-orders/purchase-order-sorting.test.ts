import { describe, expect, it } from 'vitest'
import {
  listPurchaseOrdersSchema,
  PO_SORT_FIELDS,
} from '@/lib/schemas/purchase-orders'
import {
  getDefaultPurchaseOrderSortDirection,
  resolvePurchaseOrderSortState,
} from '@/components/domain/purchase-orders/purchase-order-sorting'

describe('purchase order sorting helpers', () => {
  it('matches the schema-backed sort contract', () => {
    expect(PO_SORT_FIELDS).toEqual([
      'poNumber',
      'supplierName',
      'orderDate',
      'requiredDate',
      'totalAmount',
      'status',
      'createdAt',
    ])

    expect(listPurchaseOrdersSchema.safeParse({ sortBy: 'supplierName' }).success).toBe(true)
    expect(listPurchaseOrdersSchema.safeParse({ sortBy: 'supplierType' }).success).toBe(false)
  })

  it('defaults date and numeric fields to descending order', () => {
    expect(getDefaultPurchaseOrderSortDirection('orderDate')).toBe('desc')
    expect(getDefaultPurchaseOrderSortDirection('requiredDate')).toBe('desc')
    expect(getDefaultPurchaseOrderSortDirection('totalAmount')).toBe('desc')
  })

  it('toggles the active field when no explicit direction is provided', () => {
    expect(
      resolvePurchaseOrderSortState('status', 'asc', 'status')
    ).toEqual({
      field: 'status',
      direction: 'desc',
    })
  })
})
