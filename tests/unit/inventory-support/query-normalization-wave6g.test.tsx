import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListInventory = vi.fn();
const mockGetInventoryItem = vi.fn();
const mockGetAvailableSerials = vi.fn();
const mockListSerializedItems = vi.fn();
const mockGetSerializedItem = vi.fn();
const mockListRmas = vi.fn();
const mockGetRma = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: vi.fn() };
  },
}));

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>('@tanstack/react-start');
  return { ...actual, useServerFn: (fn: unknown) => fn };
});

vi.mock('@/server/functions/inventory/inventory', () => ({
  listInventory: (...args: unknown[]) => mockListInventory(...args),
  getInventoryItem: (...args: unknown[]) => mockGetInventoryItem(...args),
  adjustInventory: vi.fn(),
  transferInventory: vi.fn(),
  receiveInventory: vi.fn(),
  listMovements: vi.fn().mockResolvedValue({ items: [] }),
  getInventoryDashboard: vi.fn().mockResolvedValue({}),
  quickSearchInventory: vi.fn().mockResolvedValue({ items: [] }),
  getAvailableSerials: (...args: unknown[]) => mockGetAvailableSerials(...args),
}));

vi.mock('@/server/functions/inventory/locations', () => ({
  getLocationUtilization: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/server/functions/inventory/serialized-items', () => ({
  listSerializedItems: (...args: unknown[]) => mockListSerializedItems(...args),
  getSerializedItem: (...args: unknown[]) => mockGetSerializedItem(...args),
  createSerializedItem: vi.fn(),
  updateSerializedItem: vi.fn(),
  deleteSerializedItem: vi.fn(),
  addSerializedItemNote: vi.fn(),
}));

vi.mock('@/server/functions/orders/rma', () => ({
  listRmas: (...args: unknown[]) => mockListRmas(...args),
  getRma: (...args: unknown[]) => mockGetRma(...args),
  createRma: vi.fn(),
  updateRma: vi.fn(),
  approveRma: vi.fn(),
  rejectRma: vi.fn(),
  receiveRma: vi.fn(),
  processRma: vi.fn(),
  cancelRma: vi.fn(),
  bulkApproveRma: vi.fn(),
  bulkReceiveRma: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wave6GWrapper';
  return Wrapper;
}

describe('wave 6g inventory/support normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListInventory.mockResolvedValue({ items: [], total: 0 });
    mockGetInventoryItem.mockResolvedValue({ id: 'inventory-1', productId: 'product-1' });
    mockGetAvailableSerials.mockResolvedValue([]);
    mockListSerializedItems.mockResolvedValue({ items: [], total: 0, pageSize: 25 });
    mockGetSerializedItem.mockResolvedValue({ id: 'serial-1', serialNumber: 'S-001' });
    mockListRmas.mockResolvedValue({ data: [], pagination: { totalCount: 0 } });
    mockGetRma.mockResolvedValue({ id: 'rma-1', rmaNumber: 'RMA-001' });
  });

  it('treats inventory, serialized, and RMA lists as healthy shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useInventory, useAvailableSerials } = await import('@/hooks/inventory/use-inventory');
    const { useSerializedItems } = await import('@/hooks/inventory/use-serialized-items');
    const { useRmas } = await import('@/hooks/support/use-rma');

    const inventory = renderHook(() => useInventory(), { wrapper: createWrapper(queryClient) });
    const serials = renderHook(
      () => useAvailableSerials({ productId: 'product-1' }),
      { wrapper: createWrapper(queryClient) }
    );
    const serialized = renderHook(() => useSerializedItems(), { wrapper: createWrapper(queryClient) });
    const rmas = renderHook(() => useRmas(), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(inventory.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(serials.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(serialized.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(rmas.result.current.isSuccess).toBe(true));

    expect(inventory.result.current.data?.items).toEqual([]);
    expect(serials.result.current.data).toEqual([]);
    expect(serialized.result.current.data?.items).toEqual([]);
    expect(rmas.result.current.data?.data).toEqual([]);
  });

  it('preserves not-found semantics for inventory detail, serialized detail, and rma detail', async () => {
    mockGetInventoryItem.mockRejectedValueOnce({ message: 'Missing', code: 'NOT_FOUND', statusCode: 404 });
    mockGetSerializedItem.mockRejectedValueOnce({ message: 'Missing', code: 'NOT_FOUND', statusCode: 404 });
    mockGetRma.mockRejectedValueOnce({ message: 'Missing', code: 'NOT_FOUND', statusCode: 404 });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useInventoryItem } = await import('@/hooks/inventory/use-inventory');
    const { useSerializedItem } = await import('@/hooks/inventory/use-serialized-items');
    const { useRma } = await import('@/hooks/support/use-rma');

    const inventory = renderHook(() => useInventoryItem('missing-item'), { wrapper: createWrapper(queryClient) });
    const serialized = renderHook(() => useSerializedItem('missing-serial'), { wrapper: createWrapper(queryClient) });
    const rma = renderHook(() => useRma({ rmaId: 'missing-rma' }), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(inventory.result.current.error).toBeTruthy());
    await waitFor(() => expect(serialized.result.current.error).toBeTruthy());
    await waitFor(() => expect(rma.result.current.error).toBeTruthy());

    expect(inventory.result.current.error).toMatchObject({ failureKind: 'not-found' });
    expect(serialized.result.current.error).toMatchObject({ failureKind: 'not-found' });
    expect(rma.result.current.error).toMatchObject({ failureKind: 'not-found' });
  });

  it('clears the reliability baseline and keeps stale inventory/support consumers visible', async () => {
    const baseline = readFileSync(
      path.resolve('docs/reliability/baselines/read-path-query-guards.txt'),
      'utf8'
    );
    expect(baseline.trim()).toBe('');

    vi.resetModules();
    vi.doMock('@/hooks/inventory', () => ({
      useSerializedItems: () => ({
        data: { items: [{ id: 'serial-1', serialNumber: 'S-001' }], total: 1, pageSize: 25 },
        error: new Error('Serialized items are temporarily unavailable. Please refresh and try again.'),
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      }),
      useSerializedItem: () => ({ data: undefined }),
      useCreateSerializedItem: () => ({ mutateAsync: vi.fn() }),
      useUpdateSerializedItem: () => ({ mutateAsync: vi.fn() }),
      useDeleteSerializedItem: () => ({ mutateAsync: vi.fn() }),
      useAddSerializedItemNote: () => ({ mutateAsync: vi.fn() }),
    }));
    vi.doMock('@/hooks/products', () => ({
      useProducts: () => ({ data: { products: [] } }),
    }));
    vi.doMock('@/components/domain/inventory/serialized-items/serialized-items-list-presenter', () => ({
      SerializedItemsListPresenter: () => <div>serialized presenter</div>,
    }));

    const { SerializedItemsListContainer } = await import(
      '@/components/domain/inventory/serialized-items/serialized-items-list-container'
    );

    render(<SerializedItemsListContainer />);

    expect(screen.getByText('Showing cached serialized items')).toBeInTheDocument();
    expect(screen.getByText('serialized presenter')).toBeInTheDocument();
  });
});
