import { differenceInDays, parseISO } from 'date-fns'
import type { SummaryState } from '@/lib/metrics/summary-health'

export interface FulfillmentMetricOrder {
  orderDate: string | Date | null
}

export interface FulfillmentMetricOrderList {
  orders: FulfillmentMetricOrder[]
  total: number
}

export interface FulfillmentStats {
  toPick: number
  readyToShip: number
  inTransit: number
  overdue: number
}

export interface FulfillmentMetricDisplay {
  toPick: number | null
  readyToShip: number | null
  inTransit: number | null
  overdue: number | null
  summaryState: SummaryState
}

export function isOverdueOrder(orderDate: string | Date | null): boolean {
  if (!orderDate) {
    return false
  }

  const date = typeof orderDate === 'string' ? parseISO(orderDate) : orderDate
  return differenceInDays(new Date(), date) > 3
}

export function buildFulfillmentStats(input: {
  fulfillmentSummary?: FulfillmentStats | null
  summaryState?: SummaryState
}): FulfillmentMetricDisplay {
  const summaryState = input.summaryState ?? (input.fulfillmentSummary ? 'ready' : 'loading')

  if (summaryState !== 'ready' || !input.fulfillmentSummary) {
    return {
      toPick: null,
      readyToShip: null,
      inTransit: null,
      overdue: null,
      summaryState,
    }
  }

  return {
    ...input.fulfillmentSummary,
    summaryState: 'ready',
  }
}
