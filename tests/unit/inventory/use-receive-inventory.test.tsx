import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockReceiveInventory = vi.fn()
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
  adjustInventory: vi.fn(),
}))

vi.mock('@/server/functions/inventory/receiving', () => ({
  receiveInventory: (...args: unknown[]) => mockReceiveInventory(...args),
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
  Wrapper.displayName = 'ReceiveInventoryInvalidationWrapper'
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

describe('useReceiveInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
      queryKey: queryKeys.inventory.detail('inventory-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.costLayersDetail('inventory-1'),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.details(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.lowStock(),
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
      queryKey: queryKeys.products.detail('product-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventory('product-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventoryStats('product-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.stockAlertsAll(),
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

  it('refreshes serialized inventory caches after a serialized manual receive', async () => {
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
        quantity: 1,
        unitCost: 19.95,
        receiptReason: 'initial_stock',
        serialNumber: 'SN-001',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.serializedAll(),
    })
  })

  it('optimistically patches only the matching lot row for manual receive', async () => {
    mockReceiveInventory.mockResolvedValue({
      item: { id: 'inventory-lot-a' },
      movement: { id: 'movement-1' },
      message: 'Inventory received successfully',
    })

    const queryClient = new QueryClient()
    const listKey = queryKeys.inventory.list({ page: 1 })
    queryClient.setQueryData(
      listKey,
      inventoryList([
        {
          id: 'inventory-lot-a',
          productId: 'product-1',
          locationId: 'location-1',
          lotNumber: 'LOT-A',
          serialNumber: null,
          quantityOnHand: 3,
          quantityAvailable: 3,
          unitCost: 10,
          totalValue: 30,
        },
        {
          id: 'inventory-lot-b',
          productId: 'product-1',
          locationId: 'location-1',
          lotNumber: 'LOT-B',
          serialNumber: null,
          quantityOnHand: 7,
          quantityAvailable: 7,
          unitCost: 10,
          totalValue: 70,
        },
      ])
    )

    const { useReceiveInventory } = await import('@/hooks/inventory/use-inventory')
    const { result } = renderHook(() => useReceiveInventory(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        productId: 'product-1',
        locationId: 'location-1',
        quantity: 2,
        unitCost: 10,
        receiptReason: 'initial_stock',
        lotNumber: 'LOT-A',
      })
    })

    const data = queryClient.getQueryData<ReturnType<typeof inventoryList>>(listKey)
    expect(data?.items).toMatchObject([
      { id: 'inventory-lot-a', quantityOnHand: 5, quantityAvailable: 5, totalValue: 50 },
      { id: 'inventory-lot-b', quantityOnHand: 7, quantityAvailable: 7, totalValue: 70 },
    ])
  })

  it('does not optimistically patch serialized rows for a no-serial receive', async () => {
    mockReceiveInventory.mockResolvedValue({
      item: { id: 'inventory-base' },
      movement: { id: 'movement-1' },
      message: 'Inventory received successfully',
    })

    const queryClient = new QueryClient()
    const listKey = queryKeys.inventory.list({ page: 1 })
    queryClient.setQueryData(
      listKey,
      inventoryList([
        {
          id: 'inventory-base',
          productId: 'product-1',
          locationId: 'location-1',
          lotNumber: null,
          serialNumber: null,
          quantityOnHand: 3,
          quantityAvailable: 3,
          unitCost: 10,
          totalValue: 30,
        },
        {
          id: 'inventory-serial',
          productId: 'product-1',
          locationId: 'location-1',
          lotNumber: null,
          serialNumber: 'SN-001',
          quantityOnHand: 1,
          quantityAvailable: 1,
          unitCost: 10,
          totalValue: 10,
        },
      ])
    )

    const { useReceiveInventory } = await import('@/hooks/inventory/use-inventory')
    const { result } = renderHook(() => useReceiveInventory(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        productId: 'product-1',
        locationId: 'location-1',
        quantity: 2,
        unitCost: 10,
        receiptReason: 'initial_stock',
      })
    })

    const data = queryClient.getQueryData<ReturnType<typeof inventoryList>>(listKey)
    expect(data?.items).toMatchObject([
      { id: 'inventory-base', quantityOnHand: 5, quantityAvailable: 5, totalValue: 50 },
      { id: 'inventory-serial', quantityOnHand: 1, quantityAvailable: 1, totalValue: 10 },
    ])
  })

  it('optimistically patches only the matching normalized serial row', async () => {
    mockReceiveInventory.mockResolvedValue({
      item: { id: 'inventory-serial-1' },
      movement: { id: 'movement-1' },
      message: 'Inventory received successfully',
    })

    const queryClient = new QueryClient()
    const listKey = queryKeys.inventory.list({ page: 1 })
    queryClient.setQueryData(
      listKey,
      inventoryList([
        {
          id: 'inventory-serial-1',
          productId: 'product-1',
          locationId: 'location-1',
          lotNumber: null,
          serialNumber: 'SN-001',
          quantityOnHand: 0,
          quantityAvailable: 0,
          unitCost: 10,
          totalValue: 0,
        },
        {
          id: 'inventory-serial-2',
          productId: 'product-1',
          locationId: 'location-1',
          lotNumber: null,
          serialNumber: 'SN-002',
          quantityOnHand: 1,
          quantityAvailable: 1,
          unitCost: 10,
          totalValue: 10,
        },
      ])
    )

    const { useReceiveInventory } = await import('@/hooks/inventory/use-inventory')
    const { result } = renderHook(() => useReceiveInventory(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        productId: 'product-1',
        locationId: 'location-1',
        quantity: 1,
        unitCost: 10,
        receiptReason: 'initial_stock',
        serialNumber: 'sn-001',
      })
    })

    const data = queryClient.getQueryData<ReturnType<typeof inventoryList>>(listKey)
    expect(data?.items).toMatchObject([
      { id: 'inventory-serial-1', quantityOnHand: 1, quantityAvailable: 1, totalValue: 10 },
      { id: 'inventory-serial-2', quantityOnHand: 1, quantityAvailable: 1, totalValue: 10 },
    ])
  })

  it('surfaces receive validation guidance instead of a generic failure toast', async () => {
    const receiveError = Object.assign(new Error('database constraint detail'), {
      data: {
        errors: {
          code: ['insufficient_cost_layers'],
          quantity: ['Cost layers are incomplete for this item. Reconcile layers and retry.'],
        },
      },
    })
    mockReceiveInventory.mockRejectedValue(receiveError)

    const queryClient = new QueryClient()
    const { useReceiveInventory } = await import('@/hooks/inventory/use-inventory')

    const { result } = renderHook(() => useReceiveInventory(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          productId: 'product-1',
          locationId: 'location-1',
          quantity: 2,
          unitCost: 19.95,
          receiptReason: 'initial_stock',
        })
      ).rejects.toThrow('database constraint detail')
    })

    expect(mockToastError).toHaveBeenCalledWith(
      'Cost layers are incomplete for this item. Reconcile layers and retry.'
    )
  })
})
