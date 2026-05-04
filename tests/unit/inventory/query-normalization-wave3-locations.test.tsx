import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListLocations = vi.fn();
const mockGetLocation = vi.fn();
const mockCreateLocation = vi.fn();
const mockUpdateLocation = vi.fn();
const mockDeleteLocation = vi.fn();
const mockListInventory = vi.fn();

vi.mock('@/server/functions/inventory/locations', () => ({
  listLocations: (...args: unknown[]) => mockListLocations(...args),
  getLocation: (...args: unknown[]) => mockGetLocation(...args),
  createLocation: (...args: unknown[]) => mockCreateLocation(...args),
  updateLocation: (...args: unknown[]) => mockUpdateLocation(...args),
  deleteLocation: (...args: unknown[]) => mockDeleteLocation(...args),
}));

vi.mock('@/server/functions/inventory/inventory', () => ({
  listInventory: (...args: unknown[]) => mockListInventory(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'InventoryLocationsQueryNormalizationWave3Wrapper';
  return Wrapper;
}

describe('inventory locations query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListLocations.mockResolvedValue({
      locations: [],
      total: 0,
      page: 1,
      limit: 200,
      hasMore: false,
    });
    mockGetLocation.mockResolvedValue({
      location: {
        id: 'loc-1',
        locationCode: 'MAIN',
        name: 'Main Warehouse',
        locationType: 'warehouse',
        parentId: null,
        capacity: 100,
        isActive: true,
        attributes: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      contents: [],
      metrics: {
        itemCount: 0,
        totalQuantity: 0,
        totalValue: 0,
      },
    });
    mockListInventory.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
      hasMore: false,
      totals: {
        totalValue: 0,
        totalItems: 0,
        totalSkus: 0,
        lowStockCount: 0,
      },
    });
  });

  it('treats the location list as always-shaped and preserves empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useLocations } = await import('@/hooks/inventory/use-locations');

    const { result } = renderHook(() => useLocations({ autoFetch: true }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.locations).toEqual([]);
    expect(result.current.hierarchy).toEqual([]);
    expect(result.current.locationsError).toBeNull();
  });

  it('preserves not-found semantics for location detail reads', async () => {
    mockGetLocation.mockRejectedValueOnce({
      message: 'Location not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useLocations } = await import('@/hooks/inventory/use-locations');

    const { result } = renderHook(() => useLocations(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.fetchLocation('missing-location');
    });

    await waitFor(() => expect(result.current.currentLocationError).toBeTruthy());
    expect(result.current.currentLocationError).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested warehouse location could not be found.',
    });
  });

  it('treats location contents as always-shaped and preserves empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useLocations } = await import('@/hooks/inventory/use-locations');

    const { result } = renderHook(() => useLocations(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.fetchContents('loc-1');
    });

    await waitFor(() => expect(result.current.isLoadingContents).toBe(false));
    expect(result.current.contents).toEqual({
      items: [],
      totalItems: 0,
      totalValue: 0,
      utilization: 0,
    });
    expect(result.current.contentsError).toBeNull();
  });
});
