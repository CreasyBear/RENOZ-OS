import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockUseServerFn = vi.fn((fn: unknown) => fn)
const mockUpdateOrderStatus = vi.fn()
const mockChangeOrderStatusManaged = vi.fn()
const mockBulkUpdateOrderStatus = vi.fn()
const mockGetOrderStatusOptions = vi.fn()
const mockGetOrderWorkflowOptions = vi.fn()
const mockUpdateShipmentStatus = vi.fn()
const mockConfirmDelivery = vi.fn()

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
  markShipped: vi.fn(),
  deleteShipment: vi.fn(),
}))

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'OrderMutationInvalidationWrapper'
  return Wrapper
}

describe('order mutation invalidation', () => {
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
})
