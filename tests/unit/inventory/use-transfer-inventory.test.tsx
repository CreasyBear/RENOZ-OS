import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockTransferInventory = vi.fn()
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
  receiveInventory: vi.fn(),
}))

vi.mock('@/server/functions/inventory/serial-availability', () => ({
  getAvailableSerials: vi.fn(),
}))

vi.mock('@/server/functions/inventory/transfers', () => ({
  transferInventory: (...args: unknown[]) => mockTransferInventory(...args),
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
  Wrapper.displayName = 'TransferInventoryWrapper'
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

describe('useTransferInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips aggregate optimistic patches for row-scoped transfers', async () => {
    mockTransferInventory.mockResolvedValue({
      sourceItem: { id: 'inventory-row-a' },
      destinationItem: { id: 'inventory-destination' },
      message: 'Inventory transferred successfully',
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
          quantityOnHand: 10,
          quantityAvailable: 10,
          unitCost: 10,
          totalValue: 100,
        },
        {
          id: 'inventory-row-b',
          productId: 'product-1',
          locationId: 'location-1',
          quantityOnHand: 5,
          quantityAvailable: 5,
          unitCost: 10,
          totalValue: 50,
        },
      ])
    )

    const { useTransferInventory } = await import('@/hooks/inventory/use-inventory')
    const { result } = renderHook(() => useTransferInventory(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        inventoryId: 'inventory-row-a',
        productId: 'product-1',
        fromLocationId: 'location-1',
        toLocationId: 'location-2',
        quantity: 2,
      })
    })

    const data = queryClient.getQueryData<ReturnType<typeof inventoryList>>(listKey)
    expect(data?.items).toMatchObject([
      { id: 'inventory-row-a', quantityOnHand: 10, quantityAvailable: 10, totalValue: 100 },
      { id: 'inventory-row-b', quantityOnHand: 5, quantityAvailable: 5, totalValue: 50 },
    ])
  })

  it('preserves aggregate optimistic patches for unscoped transfers', async () => {
    mockTransferInventory.mockResolvedValue({
      sourceItem: { id: 'inventory-source' },
      destinationItem: { id: 'inventory-destination' },
      message: 'Inventory transferred successfully',
    })

    const queryClient = new QueryClient()
    const listKey = queryKeys.inventory.list({ page: 1 })
    queryClient.setQueryData(
      listKey,
      inventoryList([
        {
          id: 'inventory-source',
          productId: 'product-1',
          locationId: 'location-1',
          quantityOnHand: 10,
          quantityAvailable: 10,
          unitCost: 10,
          totalValue: 100,
        },
        {
          id: 'inventory-destination',
          productId: 'product-1',
          locationId: 'location-2',
          quantityOnHand: 5,
          quantityAvailable: 5,
          unitCost: 10,
          totalValue: 50,
        },
      ])
    )

    const { useTransferInventory } = await import('@/hooks/inventory/use-inventory')
    const { result } = renderHook(() => useTransferInventory(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        productId: 'product-1',
        fromLocationId: 'location-1',
        toLocationId: 'location-2',
        quantity: 2,
      })
    })

    const data = queryClient.getQueryData<ReturnType<typeof inventoryList>>(listKey)
    expect(data?.items).toMatchObject([
      { id: 'inventory-source', quantityOnHand: 8, quantityAvailable: 8, totalValue: 80 },
      { id: 'inventory-destination', quantityOnHand: 7, quantityAvailable: 7, totalValue: 70 },
    ])
  })
})
