import type { SummaryState } from '@/lib/metrics/summary-health'

export interface ReceivingMetricDisplay {
  totalOrders: number
  totalValue: number | null
  supplierCount: number | null
  oldestOrderDate: string | null
  summaryState: SummaryState
}

interface ReceivingDashboardSummary {
  totalOrders: number
  totalValue: number
  supplierCount: number
  oldestOrderDate: string | null
}

interface ReceivingOrdersData {
  pagination?: {
    totalItems?: number
  }
}

export function buildReceivingMetrics(input: {
  receivingSummary?: ReceivingDashboardSummary | null
  ordersData?: ReceivingOrdersData | null
  summaryState?: SummaryState
}): ReceivingMetricDisplay {
  const summaryState = input.summaryState ?? (input.receivingSummary ? 'ready' : 'loading')

  if (summaryState === 'unavailable') {
    return {
      totalOrders: input.ordersData?.pagination?.totalItems ?? 0,
      totalValue: null,
      supplierCount: null,
      oldestOrderDate: null,
      summaryState,
    }
  }

  if (summaryState !== 'ready' || !input.receivingSummary) {
    return {
      totalOrders: input.ordersData?.pagination?.totalItems ?? 0,
      totalValue: null,
      supplierCount: null,
      oldestOrderDate: null,
      summaryState,
    }
  }

  return {
    totalOrders: input.receivingSummary.totalOrders,
    totalValue: input.receivingSummary.totalValue,
    supplierCount: input.receivingSummary.supplierCount,
    oldestOrderDate: input.receivingSummary.oldestOrderDate,
    summaryState: 'ready',
  }
}
