import { describe, expect, it } from 'vitest'
import {
  buildFulfillmentStats,
  isOverdueOrder,
} from '@/components/domain/orders/fulfillment/fulfillment-metrics'

describe('buildFulfillmentStats', () => {
  it('prefers the authoritative server summary over page-limited rows', () => {
    expect(
      buildFulfillmentStats({
        fulfillmentSummary: {
          toPick: 120,
          readyToShip: 44,
          inTransit: 89,
          overdue: 17,
        },
        summaryState: 'ready',
      })
    ).toEqual({
      toPick: 120,
      readyToShip: 44,
      inTransit: 89,
      overdue: 17,
      summaryState: 'ready',
    })
  })

  it('keeps headline metrics unavailable while the summary is still loading', () => {
    expect(
      buildFulfillmentStats({
        summaryState: 'loading',
      })
    ).toEqual({
      toPick: null,
      readyToShip: null,
      inTransit: null,
      overdue: null,
      summaryState: 'loading',
    })
  })

  it('hides headline metrics when the authoritative summary is unavailable', () => {
    expect(
      buildFulfillmentStats({
        summaryState: 'unavailable',
      })
    ).toEqual({
      toPick: null,
      readyToShip: null,
      inTransit: null,
      overdue: null,
      summaryState: 'unavailable',
    })
  })
})

describe('isOverdueOrder', () => {
  it('uses orderDate and ignores missing dates', () => {
    expect(isOverdueOrder(null)).toBe(false)
    expect(isOverdueOrder('2026-03-29')).toBe(false)
    expect(isOverdueOrder('2026-03-20')).toBe(true)
  })
})
