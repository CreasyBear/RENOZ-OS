import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockUseServerFn = vi.fn((fn: unknown) => fn)
const mockUpdateOrderStatus = vi.fn()
const mockChangeOrderStatusManaged = vi.fn()
const mockBulkUpdateOrderStatus = vi.fn()
const mockGetOrderStatusOptions = vi.fn()
const mockGetOrderWorkflowOptions = vi.fn()
const mockUpdateShipmentStatus = vi.fn()
const mockConfirmDelivery = vi.fn()
const mockMarkShipped = vi.fn()
const mockReopenShipment = vi.fn()
const mockPickOrderItems = vi.fn()
const mockUnpickOrderItems = vi.fn()
const mockCreateOrderPayment = vi.fn()
const mockUpdateOrderPayment = vi.fn()
const mockDeleteOrderPayment = vi.fn()
const mockCreateRefundPayment = vi.fn()
const mockApproveAmendment = vi.fn()
const mockRejectAmendment = vi.fn()
const mockApplyAmendment = vi.fn()
const mockCancelAmendment = vi.fn()

vi.mock('@tanstack/react-start', () => ({
  useServerFn: (fn: unknown) => mockUseServerFn(fn),
}))

vi.mock('@/server/functions/orders/orders', () => ({
  updateOrderStatus: (...args: unknown[]) => mockUpdateOrderStatus(...args),
  changeOrderStatusManaged: (...args: unknown[]) => mockChangeOrderStatusManaged(...args),
  bulkUpdateOrderStatus: (...args: unknown[]) => mockBulkUpdateOrderStatus(...args),
  getOrderStatusOptions: (...args: unknown[]) => mockGetOrderStatusOptions(...args),
  getOrderWorkflowOptions: (...args: unknown[]) => mockGetOrderWorkflowOptions(...args),
}))

vi.mock('@/server/functions/orders/order-shipments', () => ({
  listShipments: vi.fn(),
  getShipment: vi.fn(),
  confirmDelivery: (...args: unknown[]) => mockConfirmDelivery(...args),
  updateShipmentStatus: (...args: unknown[]) => mockUpdateShipmentStatus(...args),
  getOrderShipments: vi.fn(),
  createShipment: vi.fn(),
  markShipped: (...args: unknown[]) => mockMarkShipped(...args),
  deleteShipment: vi.fn(),
  reopenShipment: (...args: unknown[]) => mockReopenShipment(...args),
}))

vi.mock('@/server/functions/orders/order-picking', () => ({
  pickOrderItems: (...args: unknown[]) => mockPickOrderItems(...args),
  unpickOrderItems: (...args: unknown[]) => mockUnpickOrderItems(...args),
}))

vi.mock('@/server/functions/orders/order-payments', () => ({
  getOrderPayments: vi.fn(),
  getOrderPayment: vi.fn(),
  getOrderPaymentSummary: vi.fn(),
  createOrderPayment: (...args: unknown[]) => mockCreateOrderPayment(...args),
  updateOrderPayment: (...args: unknown[]) => mockUpdateOrderPayment(...args),
  deleteOrderPayment: (...args: unknown[]) => mockDeleteOrderPayment(...args),
  createRefundPayment: (...args: unknown[]) => mockCreateRefundPayment(...args),
}))

vi.mock('@/server/functions/orders/order-amendments', () => ({
  listAmendments: vi.fn(),
  getAmendment: vi.fn(),
  requestAmendment: vi.fn(),
  approveAmendment: (...args: unknown[]) => mockApproveAmendment(...args),
  rejectAmendment: (...args: unknown[]) => mockRejectAmendment(...args),
  applyAmendment: (...args: unknown[]) => mockApplyAmendment(...args),
  cancelAmendment: (...args: unknown[]) => mockCancelAmendment(...args),
}))

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'OrderMutationInvalidationWrapper'
  return Wrapper
}

describe('order mutation invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('status updates invalidate finite and infinite order collections together', async () => {
    mockUpdateOrderStatus.mockResolvedValue({ success: true })

    const queryClient = new QueryClient()
    queryClient.setQueryData(queryKeys.orders.fulfillmentSummary(), { readyToShip: 1 })
    queryClient.setQueryData(queryKeys.orders.fulfillment('picked'), [])
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useUpdateOrderStatus } = await import('@/hooks/orders/use-order-status')

    const { result } = renderHook(() => useUpdateOrderStatus(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        id: 'order-1',
        status: 'confirmed',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.infiniteLists(),
    })
    expect(queryClient.getQueryState(queryKeys.orders.fulfillmentSummary())?.isInvalidated).toBe(
      true
    )
    expect(queryClient.getQueryState(queryKeys.orders.fulfillment('picked'))?.isInvalidated).toBe(
      true
    )
  })

  it('managed status changes invalidate centralized status option keys', async () => {
    const orderId = 'order-1'
    mockChangeOrderStatusManaged.mockResolvedValue({ success: true })

    const queryClient = new QueryClient()
    queryClient.setQueryData(queryKeys.orders.managedStatusOptions(orderId), {
      orderId,
      currentStatus: 'draft',
      options: [],
    })
    queryClient.setQueryData(queryKeys.orders.workflowOptions(orderId), {
      orderId,
      currentStatus: 'draft',
      actions: [],
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useChangeOrderStatusManaged } = await import('@/hooks/orders/use-order-status')

    const { result } = renderHook(() => useChangeOrderStatusManaged(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        orderId,
        targetStatus: 'confirmed',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.managedStatusOptions(orderId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.workflowOptions(orderId),
    })
    expect(queryClient.getQueryState(queryKeys.orders.managedStatusOptions(orderId))?.isInvalidated)
      .toBe(true)
    expect(queryClient.getQueryState(queryKeys.orders.workflowOptions(orderId))?.isInvalidated)
      .toBe(true)
  })

  it('shipment status updates also refresh infinite order collections', async () => {
    mockUpdateShipmentStatus.mockResolvedValue({ id: 'shipment-1' })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useUpdateShipmentStatus } = await import('@/hooks/orders/use-shipments')

    const { result } = renderHook(() => useUpdateShipmentStatus(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        id: 'shipment-1',
        idempotencyKey: 'idem-12345678',
        status: 'in_transit',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.infiniteLists(),
    })
  })

  it('mark shipped refreshes fulfillment and inventory stock side-effect surfaces', async () => {
    mockMarkShipped.mockResolvedValue({
      id: 'shipment-1',
      affectedInventoryIds: ['inventory-ship-1'],
      affectedProductIds: ['product-ship-1'],
      touchesSerializedInventory: true,
    })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useMarkShipped } = await import('@/hooks/orders/use-shipments')

    const { result } = renderHook(() => useMarkShipped(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        id: 'shipment-1',
        idempotencyKey: 'idem-12345678',
        carrier: 'DHL',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.shipmentDetail('shipment-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.fulfillmentSummary(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.fulfillment.kanban(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.detail('inventory-ship-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.costLayersDetail('inventory-ship-1'),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.details(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.movementsAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.valuationAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.availabilityAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.availableSerialsAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.serializedAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventory('product-ship-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.movementsForProduct('product-ship-1'),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.products.all,
    })
  })

  it('reopen shipment refreshes fulfillment and inventory stock side-effect surfaces', async () => {
    mockReopenShipment.mockResolvedValue({
      id: 'shipment-1',
      affectedInventoryIds: ['inventory-return-1'],
      affectedProductIds: ['product-return-1'],
      touchesSerializedInventory: false,
    })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useReopenShipment } = await import('@/hooks/orders/use-shipments')

    const { result } = renderHook(() => useReopenShipment(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        id: 'shipment-1',
        idempotencyKey: 'idem-87654321',
        reason: 'Correction needed',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.shipmentDetail('shipment-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.fulfillmentSummary(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.movementsAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.detail('inventory-return-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.costLayersDetail('inventory-return-1'),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.serializedAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventory('product-return-1'),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.products.all,
    })
  })

  it('picking refreshes fulfillment and inventory reservation surfaces', async () => {
    mockPickOrderItems.mockResolvedValue({
      lineItems: [],
      orderStatus: 'picking',
      affectedInventoryIds: ['inventory-1'],
      affectedProductIds: ['product-1'],
      touchesSerializedInventory: true,
    })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { usePickOrderItems } = await import('@/hooks/orders/use-picking')

    const { result } = renderHook(() => usePickOrderItems(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        orderId: 'order-1',
        items: [{ lineItemId: 'line-1', qtyPicked: 1 }],
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.detail('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.withCustomer('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.fulfillmentSummary(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.fulfillment.kanban(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.detail('inventory-1'),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.details(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.movementsAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.availabilityAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.availableSerialsAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.serializedAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventory('product-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventoryStats('product-1'),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.products.all,
    })
  })

  it('unpicking refreshes fulfillment and inventory reservation surfaces', async () => {
    mockUnpickOrderItems.mockResolvedValue({
      lineItems: [],
      orderStatus: 'confirmed',
      affectedInventoryIds: ['inventory-2'],
      affectedProductIds: ['product-2'],
      touchesSerializedInventory: false,
    })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useUnpickOrderItems } = await import('@/hooks/orders/use-picking')

    const { result } = renderHook(() => useUnpickOrderItems(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        orderId: 'order-1',
        items: [{ lineItemId: 'line-1', qtyToUnpick: 1 }],
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.detail('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.fulfillmentSummary(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.movementsAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.detail('inventory-2'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.availableSerialsAll(),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.serializedAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventory('product-2'),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.products.all,
    })
  })

  it('amendment review actions refresh affected order amendment surfaces without order root invalidation', async () => {
    mockApproveAmendment.mockResolvedValue({ id: 'amendment-1', orderId: 'order-1' })
    mockRejectAmendment.mockResolvedValue({ id: 'amendment-2', orderId: 'order-1' })
    mockCancelAmendment.mockResolvedValue({ id: 'amendment-3', orderId: 'order-1' })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useApproveAmendment, useRejectAmendment, useCancelAmendment } = await import(
      '@/hooks/orders/use-order-amendments'
    )

    const approve = renderHook(() => useApproveAmendment(), {
      wrapper: createWrapper(queryClient),
    })
    const reject = renderHook(() => useRejectAmendment(), {
      wrapper: createWrapper(queryClient),
    })
    const cancel = renderHook(() => useCancelAmendment(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await approve.result.current.mutateAsync({ amendmentId: 'amendment-1' })
      await reject.result.current.mutateAsync({
        amendmentId: 'amendment-2',
        reason: 'Customer declined',
      })
      await cancel.result.current.mutateAsync({
        amendmentId: 'amendment-3',
        reason: 'Superseded',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.amendments('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.amendmentDetail('amendment-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.amendmentDetail('amendment-2'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.amendmentDetail('amendment-3'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.detail('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.withCustomer('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.infiniteLists(),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.orders.all,
    })
  })

  it('applying an amendment refreshes order side effects without order root invalidation', async () => {
    mockApplyAmendment.mockResolvedValue({ id: 'amendment-4', orderId: 'order-1' })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useApplyAmendment } = await import('@/hooks/orders/use-order-amendments')

    const { result } = renderHook(() => useApplyAmendment(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        amendmentId: 'amendment-4',
        forceApply: true,
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.amendments('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.amendmentDetail('amendment-4'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.detail('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.withCustomer('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.infiniteLists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.paymentSummary('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.fulfillment(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.fulfillmentSummary(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.fulfillment.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.fulfillment.kanban(),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.orders.all,
    })
  })

  it('payment recording refreshes the full order and invoice paid-state surface', async () => {
    mockCreateOrderPayment.mockResolvedValue({ id: 'payment-1' })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useCreateOrderPayment } = await import('@/hooks/orders/use-order-payments')

    const { result } = renderHook(() => useCreateOrderPayment('order-1'), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        orderId: 'order-1',
        amount: 100,
        paymentMethod: 'bank_transfer',
        paymentDate: '2026-05-06',
        isRefund: false,
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.payments('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.paymentSummary('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.detail('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.infiniteLists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.invoices.detail('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.invoices.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.invoices.summary(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.arAging(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.dashboard(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.outstandingInvoices(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.topCustomers(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.reminderCandidates(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.revenue(),
    })
  })

  it('payment updates refresh the specific payment detail through the shared ledger helper', async () => {
    mockUpdateOrderPayment.mockResolvedValue({ id: 'payment-1' })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useUpdateOrderPayment } = await import('@/hooks/orders/use-order-payments')

    const { result } = renderHook(() => useUpdateOrderPayment('order-1'), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        id: 'payment-1',
        amount: 125,
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.paymentDetail('payment-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.paymentSummary('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.invoices.detail('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.revenue(),
    })
  })

  it('payment deletes refresh order paid-state and financial reporting surfaces', async () => {
    mockDeleteOrderPayment.mockResolvedValue({ success: true })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useDeleteOrderPayment } = await import('@/hooks/orders/use-order-payments')

    const { result } = renderHook(() => useDeleteOrderPayment('order-1'), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({ id: 'payment-1' })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.payments('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.revenue(),
    })
  })

  it('payment refunds refresh order paid-state and financial reporting surfaces', async () => {
    mockCreateRefundPayment.mockResolvedValue({ id: 'refund-1' })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useCreateRefundPayment } = await import('@/hooks/orders/use-order-payments')

    const { result } = renderHook(() => useCreateRefundPayment('order-1'), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        originalPaymentId: 'payment-1',
        amount: 50,
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.payments('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.revenue(),
    })
  })
})
