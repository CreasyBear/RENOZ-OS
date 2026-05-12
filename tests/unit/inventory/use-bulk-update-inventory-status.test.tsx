import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockBulkUpdateStatus = vi.fn()
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
  bulkUpdateStatus: (...args: unknown[]) => mockBulkUpdateStatus(...args),
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
  Wrapper.displayName = 'BulkUpdateInventoryStatusWrapper'
  return Wrapper
}

describe('useBulkUpdateInventoryStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the bulk status server function and refreshes disposition caches', async () => {
    mockBulkUpdateStatus.mockResolvedValue({
      updatedCount: 2,
      items: [
        {
          id: 'inventory-1',
          productId: 'product-1',
          serialNumber: 'SN-001',
        },
        {
          id: 'inventory-2',
          productId: 'product-2',
          serialNumber: null,
        },
      ],
    })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { useBulkUpdateInventoryStatus } = await import('@/hooks/inventory/use-inventory')
    const { result } = renderHook(() => useBulkUpdateInventoryStatus(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        inventoryIds: ['inventory-1', 'inventory-2'],
        status: 'quarantined',
        reason: 'Battery inspection hold',
      })
    })

    expect(mockBulkUpdateStatus).toHaveBeenCalledWith({
      data: {
        inventoryIds: ['inventory-1', 'inventory-2'],
        status: 'quarantined',
        reason: 'Battery inspection hold',
      },
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('2 inventory statuses updated')

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.detail('inventory-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.detail('inventory-2'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.costLayersDetail('inventory-1'),
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
      queryKey: queryKeys.inventory.serializedAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.movementsAll(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventory('product-1'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventory('product-2'),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.details(),
    })
  })

  it('shows operator-safe copy for allocated inventory status blockers', async () => {
    mockBulkUpdateStatus.mockRejectedValue({
      errors: {
        code: ['allocated_inventory_status_change'],
      },
    })

    const queryClient = new QueryClient()

    const { useBulkUpdateInventoryStatus } = await import('@/hooks/inventory/use-inventory')
    const { result } = renderHook(() => useBulkUpdateInventoryStatus(), {
      wrapper: createWrapper(queryClient),
    })

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          inventoryIds: ['inventory-1'],
          status: 'quarantined',
          reason: 'Battery inspection hold',
        })
      })
    ).rejects.toBeTruthy()

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Release allocations before changing inventory status.'
      )
    })
  })

  it('shows workflow-owned copy when bulk status tries to bypass allocation or fulfillment', async () => {
    mockBulkUpdateStatus.mockRejectedValue({
      errors: {
        code: ['workflow_owned_inventory_status'],
      },
    })

    const queryClient = new QueryClient()

    const { useBulkUpdateInventoryStatus } = await import('@/hooks/inventory/use-inventory')
    const { result } = renderHook(() => useBulkUpdateInventoryStatus(), {
      wrapper: createWrapper(queryClient),
    })

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          inventoryIds: ['inventory-1'],
          status: 'sold',
          reason: 'Operator attempted sale state',
        })
      })
    ).rejects.toBeTruthy()

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Use allocation or fulfillment workflows for allocated or sold inventory.'
      )
    })
  })
})
