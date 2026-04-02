import type { CustomerDetailData } from '@/lib/schemas/customers'
import type { CustomerOrderSummary } from '@/lib/schemas/customers/customer-detail-extended'

export function mergeCustomerDetailWithOrderSummary(
  customer: CustomerDetailData | undefined,
  orderSummary: CustomerOrderSummary | undefined
): CustomerDetailData | undefined {
  if (!customer) {
    return undefined
  }

  if (!orderSummary) {
    return customer
  }

  return {
    ...customer,
    totalOrders: orderSummary.totalOrders,
    lifetimeValue: orderSummary.totalValue,
    totalOrderValue: orderSummary.totalValue,
    averageOrderValue: orderSummary.averageOrderValue,
    orderSummary: {
      recentOrders: orderSummary.recentOrders,
      ordersByStatus: orderSummary.ordersByStatus,
    },
  }
}
