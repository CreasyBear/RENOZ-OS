import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const mockListLocations = vi.fn();
const mockGetLocation = vi.fn();
const mockCreateLocation = vi.fn();
const mockUpdateLocation = vi.fn();
const mockDeleteLocation = vi.fn();
const mockCreateWarehouseLocation = vi.fn();
const mockUpdateWarehouseLocation = vi.fn();
const mockDeleteWarehouseLocation = vi.fn();
const mockListInventory = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('@/hooks/_shared/use-toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

vi.mock('@/server/functions/inventory/locations', () => ({
  listLocations: (...args: unknown[]) => mockListLocations(...args),
  getLocation: (...args: unknown[]) => mockGetLocation(...args),
  createLocation: (...args: unknown[]) => mockCreateLocation(...args),
  updateLocation: (...args: unknown[]) => mockUpdateLocation(...args),
  deleteLocation: (...args: unknown[]) => mockDeleteLocation(...args),
  getWarehouseLocationHierarchy: vi.fn().mockResolvedValue({ hierarchy: [] }),
  createWarehouseLocation: (...args: unknown[]) => mockCreateWarehouseLocation(...args),
  updateWarehouseLocation: (...args: unknown[]) => mockUpdateWarehouseLocation(...args),
  deleteWarehouseLocation: (...args: unknown[]) => mockDeleteWarehouseLocation(...args),
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

const sampleLocation = {
  id: 'loc-1',
  organizationId: 'org-1',
  locationCode: 'MAIN',
  name: 'Main Warehouse',
  locationType: 'warehouse' as const,
  parentId: null,
  capacity: 100,
  isActive: true,
  isPickable: true,
  isReceivable: true,
  attributes: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  updatedBy: null,
};

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
      location: sampleLocation,
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
    mockCreateLocation.mockResolvedValue({ location: sampleLocation });
    mockUpdateLocation.mockResolvedValue({ location: sampleLocation });
    mockDeleteLocation.mockResolvedValue({ success: true });
    mockCreateWarehouseLocation.mockResolvedValue({ location: sampleLocation });
    mockUpdateWarehouseLocation.mockResolvedValue({ location: sampleLocation });
    mockDeleteWarehouseLocation.mockResolvedValue({ success: true });
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

  it('uses safe mutation fallback copy instead of raw composite location errors', async () => {
    mockCreateLocation.mockRejectedValue(
      new Error('duplicate key value violates unique constraint warehouse_locations_location_code_key')
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useLocations } = await import('@/hooks/inventory/use-locations');

    const { result } = renderHook(() => useLocations(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.createNewLocation({
          code: 'MAIN',
          name: 'Main Warehouse',
          locationType: 'warehouse',
        })
      ).rejects.toThrow('warehouse_locations_location_code_key');
    });

    expect(mockToastError).toHaveBeenCalledWith('Failed to create location');
  });

  it('refreshes composable location mutation prefixes without location root invalidation', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useLocations } = await import('@/hooks/inventory/use-locations');

    const { result } = renderHook(() => useLocations(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.createNewLocation({
        code: 'MAIN',
        name: 'Main Warehouse',
        locationType: 'warehouse',
      });
      await result.current.updateExistingLocation('loc-1', { name: 'Main Warehouse' });
      await result.current.deleteExistingLocation('loc-1');
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.locations.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.locations.tree(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.locations.hierarchies(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.locations.utilization(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.locations.detail('loc-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.locations.contents('loc-1'),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.locations.all,
    });
  });

  it('refreshes focused warehouse location mutation prefixes without location root invalidation', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const {
      useCreateWarehouseLocation,
      useUpdateWarehouseLocation,
      useDeleteWarehouseLocation,
    } = await import('@/hooks/inventory/use-locations');

    const create = renderHook(() => useCreateWarehouseLocation(), {
      wrapper: createWrapper(queryClient),
    });
    const update = renderHook(() => useUpdateWarehouseLocation(), {
      wrapper: createWrapper(queryClient),
    });
    const remove = renderHook(() => useDeleteWarehouseLocation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await create.result.current.mutateAsync({
        locationCode: 'MAIN',
        name: 'Main Warehouse',
        locationType: 'warehouse',
        isActive: true,
        isPickable: true,
        isReceivable: true,
      });
      await update.result.current.mutateAsync({
        id: 'loc-1',
        data: { name: 'Main Warehouse' },
      });
      await remove.result.current.mutateAsync('loc-1');
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.locations.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.locations.tree(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.locations.hierarchies(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.locations.utilization(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.locations.detail('loc-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.locations.contents('loc-1'),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.locations.all,
    });
  });

  it('uses safe mutation fallback copy instead of raw warehouse-location errors', async () => {
    mockDeleteWarehouseLocation.mockRejectedValue(
      new Error('violates foreign key constraint inventory_location_id_fkey')
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useDeleteWarehouseLocation } = await import('@/hooks/inventory/use-locations');

    const { result } = renderHook(() => useDeleteWarehouseLocation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync('loc-1')).rejects.toThrow(
        'inventory_location_id_fkey'
      );
    });

    expect(mockToastError).toHaveBeenCalledWith('Failed to delete location');
  });

  it('uses safe route submit copy instead of raw warehouse-location errors', async () => {
    const { getLocationMutationSubmitError } = await import(
      '@/routes/_authenticated/inventory/location-error-messages'
    );

    expect(
      getLocationMutationSubmitError(
        new Error('duplicate key value violates unique constraint warehouse_locations_location_code_key')
      )
    ).toBe('Failed to save location');
  });

  it('keeps CSV import validation guidance but hides raw server import failures', async () => {
    const {
      getLocationImportErrorMessage,
      LocationImportValidationError,
    } = await import('@/routes/_authenticated/inventory/location-error-messages');

    expect(
      getLocationImportErrorMessage(
        new LocationImportValidationError('Row 2: invalid locationType "drawer"')
      )
    ).toBe('Row 2: invalid locationType "drawer"');

    expect(
      getLocationImportErrorMessage(
        new Error('insert into warehouse_locations violates row-level security policy')
      )
    ).toBe('Failed to import locations');
  });
});
