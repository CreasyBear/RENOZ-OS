import { describe, expect, it } from 'vitest'
import { mergeCustomerDetailWithOrderSummary } from '@/hooks/customers/customer-detail-metrics'
import type { CustomerDetailData } from '@/lib/schemas/customers'
import type { CustomerOrderSummary } from '@/lib/schemas/customers/customer-detail-extended'

const baseCustomer: CustomerDetailData = {
  id: 'customer-1',
  name: 'Acme Corp',
  customerCode: 'CUST-001',
  status: 'active',
  type: 'business',
  totalOrders: 0,
  creditHold: false,
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const orderSummary: CustomerOrderSummary = {
  totalOrders: 3,
  totalValue: 12500,
  outstandingBalance: 2500,
  averageOrderValue: 4166.67,
  recentOrders: [
    {
      id: 'order-1',
      orderNumber: 'ORD-001',
      status: 'confirmed',
      paymentStatus: 'pending',
      total: 5000,
      orderDate: '2026-03-01',
    },
  ],
  ordersByStatus: [
    {
      status: 'confirmed',
      count: 3,
      totalValue: 12500,
    },
  ],
}

describe('mergeCustomerDetailWithOrderSummary', () => {
  it('applies authoritative order aggregates to customer detail data', () => {
    expect(
      mergeCustomerDetailWithOrderSummary(baseCustomer, orderSummary)
    ).toMatchObject({
      totalOrders: 3,
      lifetimeValue: 12500,
      totalOrderValue: 12500,
      averageOrderValue: 4166.67,
      orderSummary: {
        recentOrders: orderSummary.recentOrders,
        ordersByStatus: orderSummary.ordersByStatus,
      },
    })
  })

  it('leaves the base customer untouched when the summary query is unavailable', () => {
    expect(
      mergeCustomerDetailWithOrderSummary(baseCustomer, undefined)
    ).toEqual(baseCustomer)
  })
})
