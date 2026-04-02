import { describe, expect, it } from 'vitest'
import {
  ALERT_SORT_FIELDS,
  getDefaultAlertSortDirection,
  resolveAlertSortState,
} from '@/components/domain/inventory/alerts/alert-sorting'

describe('alert sorting helpers', () => {
  it('exposes the canonical alert sort fields', () => {
    expect(ALERT_SORT_FIELDS).toEqual([
      'alertType',
      'isActive',
      'lastTriggeredAt',
      'createdAt',
    ])
  })

  it('defaults recency fields to descending order', () => {
    expect(getDefaultAlertSortDirection('lastTriggeredAt')).toBe('desc')
    expect(getDefaultAlertSortDirection('createdAt')).toBe('desc')
    expect(getDefaultAlertSortDirection('isActive')).toBe('asc')
  })

  it('rejects unsupported alert sort fields', () => {
    expect(resolveAlertSortState('createdAt', 'desc', 'product')).toBeNull()
  })
})
