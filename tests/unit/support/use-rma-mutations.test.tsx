import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createRmaMock = vi.fn();
const receiveRmaMock = vi.fn();
const processRmaMock = vi.fn();

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
  bulkReceiveRma: vi.fn(),
}));

describe('useRma mutations hardening', () => {
  beforeEach(() => {
    createRmaMock.mockReset();
    receiveRmaMock.mockReset();
    processRmaMock.mockReset();
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
    });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
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

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['inventory'],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['orders', 'detail', 'order-1'],
    });
  });
});
