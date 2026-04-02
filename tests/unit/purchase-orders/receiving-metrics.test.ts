import { describe, expect, it } from 'vitest'
import { buildReceivingMetrics } from '@/components/domain/procurement/receiving/receiving-metrics'

describe('buildReceivingMetrics', () => {
  it('uses the server summary for headline receiving metrics', () => {
    expect(
      buildReceivingMetrics({
        receivingSummary: {
          totalOrders: 240,
          totalValue: 125000,
          supplierCount: 18,
          oldestOrderDate: '2026-02-01',
        },
        ordersData: {
          pagination: {
            totalItems: 100,
          },
        },
        summaryState: 'ready',
      })
    ).toEqual({
      totalOrders: 240,
      totalValue: 125000,
      supplierCount: 18,
      oldestOrderDate: '2026-02-01',
      summaryState: 'ready',
    })
  })

  it('keeps summary-backed metrics unavailable while the summary is still loading', () => {
    expect(
      buildReceivingMetrics({
        ordersData: {
          pagination: {
            totalItems: 42,
          },
        },
        summaryState: 'loading',
      })
    ).toEqual({
      totalOrders: 42,
      totalValue: null,
      supplierCount: null,
      oldestOrderDate: null,
      summaryState: 'loading',
    })
  })

  it('hides summary-backed cards when the summary query fails', () => {
    expect(
      buildReceivingMetrics({
        summaryState: 'unavailable',
        ordersData: {
          pagination: {
            totalItems: 42,
          },
        },
      })
    ).toEqual({
      totalOrders: 42,
      totalValue: null,
      supplierCount: null,
      oldestOrderDate: null,
      summaryState: 'unavailable',
    })
  })
})
