import { describe, expect, it } from 'vitest'
import {
  getDefaultOrderSortDirection,
  resolveOrderSortState,
} from '@/components/domain/orders/order-sorting'

describe('order sorting helpers', () => {
  it('defaults numeric and date columns to descending order', () => {
    expect(getDefaultOrderSortDirection('orderDate')).toBe('desc')
    expect(getDefaultOrderSortDirection('total')).toBe('desc')
    expect(getDefaultOrderSortDirection('createdAt')).toBe('desc')
  })

  it('preserves an explicitly requested sort direction', () => {
    expect(
      resolveOrderSortState('createdAt', 'desc', 'orderNumber', 'desc')
    ).toEqual({
      field: 'orderNumber',
      direction: 'desc',
    })

    expect(
      resolveOrderSortState('orderNumber', 'asc', 'customer', 'asc')
    ).toEqual({
      field: 'customer',
      direction: 'asc',
    })
  })

  it('toggles direction when the same field is selected again without an explicit direction', () => {
    expect(resolveOrderSortState('orderNumber', 'asc', 'orderNumber')).toEqual({
      field: 'orderNumber',
      direction: 'desc',
    })
  })

  it('rejects unsupported sort fields', () => {
    expect(resolveOrderSortState('createdAt', 'desc', 'itemCount')).toBeNull()
  })
})
