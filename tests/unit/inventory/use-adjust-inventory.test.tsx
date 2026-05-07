import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockAdjustInventory = vi.fn()
const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

vi.mock('@/hooks/_shared/use-toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}))

vi.mock('@/server/functions/inventory/inventory', () => ({
  listInventory: vi.fn(),
  getInventoryItem: vi.fn(),
  quickSearchInventory: vi.fn(),
}))

vi.mock('@/server/functions/inventory/dashboard', () => ({
  getInventoryDashboard: vi.fn(),
}))

vi.mock('@/server/functions/inventory/adjustments', () => ({
  adjustInventory: (...args: unknown[]) => mockAdjustInventory(...args),
}))

vi.mock('@/server/functions/inventory/receiving', () => ({
  receiveInventory: vi.fn(),
}))

vi.mock('@/server/functions/inventory/serial-availability', () => ({
  getAvailableSerials: vi.fn(),
}))

vi.mock('@/server/functions/inventory/transfers', () => ({
  transferInventory: vi.fn(),
}))

vi.mock('@/server/functions/inventory/locations', () => ({
  getLocationUtilization: vi.fn(),
}))

vi.mock('@/server/functions/inventory/movements', () => ({
  listMovements: vi.fn(),
}))

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'AdjustInventoryWrapper'
  return Wrapper
}

function inventoryList(items: Array<Record<string, unknown>>) {
  return {
    items,
    total: items.length,
    page: 1,
    limit: 20,
    hasMore: false,
    totals: {
      totalValue: 0,
      totalItems: items.length,
      totalSkus: 1,
      lowStockCount: 0,
    },
  }
}

describe('useAdjustInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips aggregate optimistic patches for product/location adjustments', async () => {
    mockAdjustInventory.mockResolvedValue({
      item: { id: 'inventory-row-a' },
      movement: { id: 'movement-1' },
      message: 'Inventory adjusted successfully',
    })

    const queryClient = new QueryClient()
    const listKey = queryKeys.inventory.list({ page: 1 })
    queryClient.setQueryData(
      listKey,
      inventoryList([
        {
          id: 'inventory-row-a',
          productId: 'product-1',
          locationId: 'location-1',
          lotNumber: 'LOT-A',
          quantityOnHand: 10,
          quantityAvailable: 10,
          unitCost: 10,
          totalValue: 100,
        },
        {
          id: 'inventory-row-b',
          productId: 'product-1',
          locationId: 'location-1',
          lotNumber: 'LOT-B',
          quantityOnHand: 5,
          quantityAvailable: 5,
          unitCost: 10,
          totalValue: 50,
        },
      ])
    )

    const { useAdjustInventory } = await import('@/hooks/inventory/use-inventory')
    const { result } = renderHook(() => useAdjustInventory(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        productId: 'product-1',
        locationId: 'location-1',
        adjustmentQty: 2,
        reason: 'cycle_count',
      })
    })

    const data = queryClient.getQueryData<ReturnType<typeof inventoryList>>(listKey)
    expect(data?.items).toMatchObject([
      { id: 'inventory-row-a', quantityOnHand: 10, quantityAvailable: 10, totalValue: 100 },
      { id: 'inventory-row-b', quantityOnHand: 5, quantityAvailable: 5, totalValue: 50 },
    ])
  })

  it('skips aggregate optimistic patches for row-scoped adjustments', async () => {
    mockAdjustInventory.mockResolvedValue({
      item: { id: 'inventory-row-a' },
      movement: { id: 'movement-1' },
      message: 'Inventory adjusted successfully',
    })

    const queryClient = new QueryClient()
    const listKey = queryKeys.inventory.list({ page: 1 })
    queryClient.setQueryData(
      listKey,
      inventoryList([
        {
          id: 'inventory-row-a',
          productId: 'product-1',
          locationId: 'location-1',
          serialNumber: 'SN-001',
          quantityOnHand: 1,
          quantityAvailable: 1,
          unitCost: 10,
          totalValue: 10,
        },
      ])
    )

    const { useAdjustInventory } = await import('@/hooks/inventory/use-inventory')
    const { result } = renderHook(() => useAdjustInventory(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        inventoryId: 'inventory-row-a',
        productId: 'product-1',
        locationId: 'location-1',
        adjustmentQty: -1,
        reason: 'damaged',
      })
    })

    const data = queryClient.getQueryData<ReturnType<typeof inventoryList>>(listKey)
    expect(data?.items).toMatchObject([
      { id: 'inventory-row-a', quantityOnHand: 1, quantityAvailable: 1, totalValue: 10 },
    ])
  })

  it('refreshes exact affected detail and operational stock surfaces after adjustment', async () => {
    mockAdjustInventory.mockResolvedValue({
      item: { id: 'inventory-row-a' },
      affectedInventoryIds: ['inventory-row-a'],
      movement: { id: 'movement-1' },
      message: 'Inventory adjusted successfully',
    })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { useAdjustInventory } = await import('@/hooks/inventory/use-inventory')
    const { result } = renderHook(() => useAdjustInventory(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        inventoryId: 'inventory-row-a',
        productId: 'product-1',
        locationId: 'location-1',
        adjustmentQty: -1,
        reason: 'damaged',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.detail('inventory-row-a'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.costLayersDetail('inventory-row-a'),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.details(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.dashboard(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.wmsAll(),
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
      queryKey: queryKeys.products.inventory('product-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.stockAlertsAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.movementsAll(),
    })
  })
})
