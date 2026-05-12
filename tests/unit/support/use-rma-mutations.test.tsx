import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const createRmaMock = vi.fn();
const receiveRmaMock = vi.fn();
const processRmaMock = vi.fn();
const bulkReceiveRmaMock = vi.fn();

vi.mock('@/server/functions/orders/rma', () => ({
  listRmas: vi.fn(),
  getRma: vi.fn(),
  createRma: (args: unknown) => createRmaMock(args),
  updateRma: vi.fn(),
  approveRma: vi.fn(),
  rejectRma: vi.fn(),
  receiveRma: (args: unknown) => receiveRmaMock(args),
  processRma: (args: unknown) => processRmaMock(args),
  cancelRma: vi.fn(),
  bulkApproveRma: vi.fn(),
  bulkReceiveRma: (args: unknown) => bulkReceiveRmaMock(args),
}));

describe('useRma mutations hardening', () => {
  beforeEach(() => {
    createRmaMock.mockReset();
    receiveRmaMock.mockReset();
    processRmaMock.mockReset();
    bulkReceiveRmaMock.mockReset();
  });

  function createWrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
  }

  it('refreshes RMA detail and linked order detail after creating an RMA', async () => {
    createRmaMock.mockResolvedValue({
      id: 'rma-1',
      orderId: 'order-1',
      rmaNumber: 'RMA-001',
    });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
    const { useCreateRma } = await import('@/hooks/support/use-rma');
    const { result } = renderHook(() => useCreateRma(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        orderId: 'order-1',
        reason: 'defective',
        lineItems: [{ orderLineItemId: 'line-1', quantityReturned: 1 }],
      });
    });

    expect(setQueryDataSpy).toHaveBeenCalledWith(
      ['support', 'rmas', 'detail', 'rma-1'],
      expect.objectContaining({ id: 'rma-1' })
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['orders', 'detail', 'order-1'],
    });
  });

  it('refreshes inventory and order detail after receiving an RMA', async () => {
    receiveRmaMock.mockResolvedValue({
      id: 'rma-1',
      orderId: 'order-1',
      unitsRestored: 2,
      affectedInventoryIds: ['inventory-return-1'],
      affectedProductIds: ['product-return-1'],
      touchesSerializedInventory: false,
    });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
    const { useReceiveRma } = await import('@/hooks/support/use-rma');
    const { result } = renderHook(() => useReceiveRma(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        rmaId: 'rma-1',
        locationId: 'loc-1',
      });
    });

    expect(setQueryDataSpy).toHaveBeenCalledWith(
      queryKeys.support.rmaDetail('rma-1'),
      expect.objectContaining({ id: 'rma-1' })
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.detail('inventory-return-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.costLayersDetail('inventory-return-1'),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.details(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.movementsAll(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.valuationAll(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.availabilityAll(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.availableSerialsAll(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventory('product-return-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.movementsForProduct('product-return-1'),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.all,
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.products.all,
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.serializedAll(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.detail('order-1'),
    });
  });

  it('refreshes exact inventory identities after bulk receiving RMAs', async () => {
    bulkReceiveRmaMock.mockResolvedValue({
      updated: 1,
      failed: [],
      affectedInventoryIds: ['inventory-return-1'],
      affectedProductIds: ['product-return-1'],
      touchesSerializedInventory: true,
    });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useBulkReceiveRma } = await import('@/hooks/support/use-rma');
    const { result } = renderHook(() => useBulkReceiveRma(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        rmaIds: ['rma-1'],
        locationId: 'loc-1',
      });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.support.rmasList(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.support.rmaDetails(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.detail('inventory-return-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.costLayersDetail('inventory-return-1'),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.details(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.movementsAll(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.serializedAll(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventory('product-return-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.movementsForProduct('product-return-1'),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.all,
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.products.all,
    });
  });

  it('refreshes linked issue and order context after executing a remedy', async () => {
    processRmaMock.mockResolvedValue({
      id: 'rma-1',
      orderId: 'order-1',
      issueId: 'issue-1',
      execution: {
        status: 'completed',
      },
    });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
    const { useProcessRma } = await import('@/hooks/support/use-rma');
    const { result } = renderHook(() => useProcessRma(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        rmaId: 'rma-1',
        resolution: 'repair',
        notes: 'Repaired on bench.',
      });
    });

    expect(setQueryDataSpy).toHaveBeenCalledWith(
      ['support', 'rmas', 'detail', 'rma-1'],
      expect.objectContaining({ id: 'rma-1' })
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['orders', 'detail', 'order-1'],
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.financial.revenue(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['support', 'issues', 'detail', 'issue-1'],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['support', 'issues', 'list'],
    });
  });

  it('refreshes source and replacement order context after executing a replacement remedy', async () => {
    processRmaMock.mockResolvedValue({
      id: 'rma-1',
      orderId: 'order-1',
      customerId: 'customer-1',
      issueId: 'issue-1',
      replacementOrderId: 'order-2',
      execution: {
        status: 'completed',
        replacementOrder: { id: 'order-2', label: 'ORD-2' },
      },
    });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useProcessRma } = await import('@/hooks/support/use-rma');
    const { result } = renderHook(() => useProcessRma(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        rmaId: 'rma-1',
        resolution: 'replacement',
        confirmReplacement: true,
        notes: 'Replacement draft created.',
      });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.detail('order-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.withCustomer('order-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.detail('order-2'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.withCustomer('order-2'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.infiniteLists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.byCustomer('customer-1'),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.financial.creditNotes(),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.financial.revenue(),
    });
  });

  it('refreshes credit note, customer, and order context after executing an issued credit remedy', async () => {
    processRmaMock.mockResolvedValue({
      id: 'rma-1',
      orderId: 'order-1',
      customerId: 'customer-1',
      issueId: 'issue-1',
      creditNoteId: 'credit-1',
      execution: {
        status: 'completed',
        creditNote: { id: 'credit-1', label: 'CN-1' },
      },
    });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useProcessRma } = await import('@/hooks/support/use-rma');
    const { result } = renderHook(() => useProcessRma(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        rmaId: 'rma-1',
        resolution: 'credit',
        amount: 75,
        creditReason: 'Returned equipment',
        applyNow: false,
        notes: 'Issued customer credit from RMA.',
      });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.creditNotes(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.creditNoteDetail('credit-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.detail('customer-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.detail('order-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.infiniteLists(),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.invoices.summary(),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.financial.arAging(),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.financial.revenue(),
    });
  });

  it('refreshes invoice and balance reporting surfaces after executing an applied credit remedy', async () => {
    processRmaMock.mockResolvedValue({
      id: 'rma-1',
      orderId: 'order-1',
      customerId: 'customer-1',
      issueId: 'issue-1',
      creditNoteId: 'credit-1',
      execution: {
        status: 'completed',
        creditNote: { id: 'credit-1', label: 'CN-1' },
      },
    });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useProcessRma } = await import('@/hooks/support/use-rma');
    const { result } = renderHook(() => useProcessRma(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        rmaId: 'rma-1',
        resolution: 'credit',
        amount: 75,
        creditReason: 'Returned equipment',
        applyNow: true,
        notes: 'Applied customer credit from RMA.',
      });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.invoices.detail('order-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.invoices.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.invoices.summary(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.arAging(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.dashboard(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.outstandingInvoices(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.topCustomers(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.reminderCandidates(),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.financial.revenue(),
    });
  });

  it('refreshes payment ledger and reporting surfaces after executing a refund remedy', async () => {
    processRmaMock.mockResolvedValue({
      id: 'rma-1',
      orderId: 'order-1',
      issueId: 'issue-1',
      execution: {
        status: 'completed',
        refundPayment: { id: 'refund-1', label: null },
      },
    });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useProcessRma } = await import('@/hooks/support/use-rma');
    const { result } = renderHook(() => useProcessRma(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        rmaId: 'rma-1',
        resolution: 'refund',
        originalPaymentId: 'payment-1',
        amount: 75,
        notes: 'Refunded from RMA.',
      });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.payments('order-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.paymentSummary('order-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.detail('order-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.orders.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.invoices.summary(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.financial.revenue(),
    });
  });
});
