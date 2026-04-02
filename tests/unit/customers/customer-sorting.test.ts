import { describe, expect, it } from 'vitest'
import {
  getDefaultCustomerSortDirection,
  resolveCustomerSortState,
} from '@/components/domain/customers/customer-sorting'

describe('customer sorting helpers', () => {
  it('defaults metric and recency columns to descending order', () => {
    expect(getDefaultCustomerSortDirection('lifetimeValue')).toBe('desc')
    expect(getDefaultCustomerSortDirection('totalOrders')).toBe('desc')
    expect(getDefaultCustomerSortDirection('healthScore')).toBe('desc')
    expect(getDefaultCustomerSortDirection('lastOrderDate')).toBe('desc')
  })

  it('preserves an explicitly requested sort direction', () => {
    expect(
      resolveCustomerSortState('createdAt', 'desc', 'lifetimeValue', 'asc')
    ).toEqual({
      field: 'lifetimeValue',
      direction: 'asc',
    })

    expect(
      resolveCustomerSortState('name', 'asc', 'totalOrders', 'desc')
    ).toEqual({
      field: 'totalOrders',
      direction: 'desc',
    })
  })

  it('toggles direction when the same field is selected again without an explicit direction', () => {
    expect(
      resolveCustomerSortState('name', 'asc', 'name')
    ).toEqual({
      field: 'name',
      direction: 'desc',
    })
  })

  it('rejects unsupported sort fields', () => {
    expect(
      resolveCustomerSortState('createdAt', 'desc', 'industry')
    ).toBeNull()
  })
})
