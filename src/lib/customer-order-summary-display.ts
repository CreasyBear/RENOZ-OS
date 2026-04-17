import type { SummaryState } from '@/lib/metrics/summary-health';

export interface CustomerOrderSummaryDisplayPolicy {
  orderSummaryUnavailable: boolean;
  lifetimeValueDisplay: number | '--';
  totalOrdersDisplay: number | '--';
  ordersTabLabel: string;
  metricSubtitle?: string;
}

export function getCustomerOrderSummaryDisplayPolicy(input: {
  orderSummaryState: SummaryState;
  lifetimeValue: number | null | undefined;
  totalOrders: number;
}): CustomerOrderSummaryDisplayPolicy {
  const orderSummaryUnavailable = input.orderSummaryState === 'unavailable';

  if (orderSummaryUnavailable) {
    return {
      orderSummaryUnavailable: true,
      lifetimeValueDisplay: '--',
      totalOrdersDisplay: '--',
      ordersTabLabel: 'Orders',
      metricSubtitle: 'Temporarily unavailable',
    };
  }

  return {
    orderSummaryUnavailable: false,
    lifetimeValueDisplay: input.lifetimeValue ?? 0,
    totalOrdersDisplay: input.totalOrders,
    ordersTabLabel: `Orders (${input.totalOrders})`,
  };
}
