import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockUseServerFn = vi.fn((fn: unknown) => fn)
const mockBulkReceiveGoods = vi.fn()
const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

vi.mock('@tanstack/react-start', () => ({
  useServerFn: (fn: unknown) => mockUseServerFn(fn),
}))

vi.mock('@/server/functions/suppliers/bulk-receive-goods', () => ({
  bulkReceiveGoods: (...args: unknown[]) => mockBulkReceiveGoods(...args),
}))

vi.mock('@/hooks', () => ({
  toastError: (...args: unknown[]) => mockToastError(...args),
  toastSuccess: (...args: unknown[]) => mockToastSuccess(...args),
}))

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'BulkReceiveGoodsInvalidationWrapper'
  return Wrapper
}

describe('useBulkReceiveGoods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refreshes affected purchase-order, receiving, inventory, and product surfaces after bulk receive', async () => {
    mockBulkReceiveGoods.mockResolvedValue({
      success: true,
      message: 'Processed 1 purchase order with 1 failure.',
      processed: 1,
      failed: 1,
      errors: [{ poId: 'po-2', error: 'Blocked by serialized product validation' }],
      errorsById: { 'po-2': 'Blocked by serialized product validation' },
      partialFailure: {
        code: 'transition_blocked',
        message: 'Some purchase orders were not receipted. Review failed rows and retry.',
      },
      affectedIds: ['po-1'],
    })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { useBulkReceiveGoods } = await import('@/hooks/suppliers/use-bulk-receive-goods')

    const { result } = renderHook(() => useBulkReceiveGoods(), {
      wrapper: createWrapper(queryClient),
    })

    const onProgress = vi.fn()
    await act(async () => {
      await result.current.mutateAsync({
        purchaseOrderIds: ['po-1', 'po-2'],
        onProgress,
      })
    })

    expect(mockBulkReceiveGoods).toHaveBeenCalledWith({
      data: {
        purchaseOrderIds: ['po-1', 'po-2'],
        serialNumbers: undefined,
      },
    })
    expect(onProgress).toHaveBeenCalledWith(1, 1)

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.suppliers.purchaseOrdersList(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.suppliers.purchaseOrderStatusCounts(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.suppliers.purchaseOrdersReceivingSummary(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.suppliers.purchaseOrdersPendingApprovals(),
    })

    for (const purchaseOrderId of ['po-1', 'po-2']) {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(purchaseOrderId),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.suppliers.purchaseOrderItems(purchaseOrderId),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.suppliers.purchaseOrderReceipts(purchaseOrderId),
      })
    }

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.all,
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.all,
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Processed 1 purchase order with 1 failure.')
    expect(mockToastError).toHaveBeenCalledWith(
      'Some purchase orders were not receipted. Review failed rows and retry.'
    )
  })

  it('formats root bulk receive failures without leaking unsafe server messages', async () => {
    mockBulkReceiveGoods.mockRejectedValue(
      new Error('duplicate key value violates unique constraint purchase_order_receipts_pkey')
    )

    const queryClient = new QueryClient()
    const { useBulkReceiveGoods } = await import('@/hooks/suppliers/use-bulk-receive-goods')

    const { result } = renderHook(() => useBulkReceiveGoods(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          purchaseOrderIds: ['po-1'],
        })
      ).rejects.toThrow('duplicate key value violates unique constraint purchase_order_receipts_pkey')
    })

    expect(mockToastError).toHaveBeenCalledWith('Failed to process bulk receiving')
    expect(mockToastError).not.toHaveBeenCalledWith(
      expect.stringContaining('duplicate key value violates')
    )
  })
})
