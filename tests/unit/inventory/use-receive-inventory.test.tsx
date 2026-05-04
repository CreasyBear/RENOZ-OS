import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockReceiveInventory = vi.fn()

vi.mock('@/server/functions/inventory/inventory', () => ({
  listInventory: vi.fn(),
  getInventoryItem: vi.fn(),
  adjustInventory: vi.fn(),
  transferInventory: vi.fn(),
  receiveInventory: (...args: unknown[]) => mockReceiveInventory(...args),
  listMovements: vi.fn(),
  getInventoryDashboard: vi.fn(),
  quickSearchInventory: vi.fn(),
  getAvailableSerials: vi.fn(),
}))

vi.mock('@/server/functions/inventory/locations', () => ({
  getLocationUtilization: vi.fn(),
}))

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'ReceiveInventoryInvalidationWrapper'
  return Wrapper
}

describe('useReceiveInventory', () => {
  it('refreshes inventory and related product detail queries after a manual receive', async () => {
    mockReceiveInventory.mockResolvedValue({
      item: { id: 'inventory-1' },
      movement: { id: 'movement-1' },
      message: 'Inventory received successfully',
    })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useReceiveInventory } = await import('@/hooks/inventory/use-inventory')

    const { result } = renderHook(() => useReceiveInventory(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        productId: 'product-1',
        locationId: 'location-1',
        quantity: 2,
        unitCost: 19.95,
        receiptReason: 'initial_stock',
      })
    })

    expect(mockReceiveInventory).toHaveBeenCalledWith({
      data: {
        productId: 'product-1',
        locationId: 'location-1',
        quantity: 2,
        unitCost: 19.95,
        receiptReason: 'initial_stock',
      },
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.details(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.lowStock(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.detail('product-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventory('product-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventoryStats('product-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.stockAlerts('product-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.movementsForProduct('product-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.movementsAggregatedForProduct('product-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.movementsAll(),
    })
  })
})
