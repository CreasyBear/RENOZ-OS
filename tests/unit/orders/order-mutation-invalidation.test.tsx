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
  deleteOrderPayment: vi.fn(),
  createRefundPayment: vi.fn(),
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
      queryKey: queryKeys.invoices.detail('order-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.invoices.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.invoices.summary(),
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
  })
})
