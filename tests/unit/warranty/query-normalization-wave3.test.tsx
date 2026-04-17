import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListWarranties = vi.fn();
const mockGetWarrantyStatusCounts = vi.fn();
const mockGetWarranty = vi.fn();
const mockGetExpiringWarranties = vi.fn();
const mockGetExpiringWarrantiesReport = vi.fn();
const mockGetExpiringWarrantiesFilterOptions = vi.fn();

vi.mock('@/server/functions/warranty', () => ({
  listWarranties: (...args: unknown[]) => mockListWarranties(...args),
  getWarrantyStatusCounts: (...args: unknown[]) => mockGetWarrantyStatusCounts(...args),
  getWarranty: (...args: unknown[]) => mockGetWarranty(...args),
  updateWarrantyOptOut: vi.fn(),
  deleteWarranty: vi.fn(),
  voidWarranty: vi.fn(),
  transferWarranty: vi.fn(),
}));

vi.mock('@/server/functions/warranty/core/warranties', () => ({
  getExpiringWarranties: (...args: unknown[]) => mockGetExpiringWarranties(...args),
  getExpiringWarrantiesReport: (...args: unknown[]) =>
    mockGetExpiringWarrantiesReport(...args),
  getExpiringWarrantiesFilterOptions: (...args: unknown[]) =>
    mockGetExpiringWarrantiesFilterOptions(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'WarrantyQueryNormalizationWave3Wrapper';
  return Wrapper;
}

describe('warranty query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListWarranties.mockResolvedValue({
      warranties: [],
      total: 0,
      hasMore: false,
      nextOffset: undefined,
    });
    mockGetWarrantyStatusCounts.mockResolvedValue({
      all: 0,
      expiring_soon: 0,
      expired: 0,
    });
    mockGetWarranty.mockResolvedValue({
      id: 'warranty-1',
      warrantyNumber: 'WAR-001',
    });
    mockGetExpiringWarranties.mockResolvedValue({
      warranties: [],
      totalCount: 0,
    });
    mockGetExpiringWarrantiesReport.mockResolvedValue({
      warranties: [],
      totalCount: 0,
      totalValue: 0,
      avgDaysToExpiry: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    mockGetExpiringWarrantiesFilterOptions.mockResolvedValue({
      customers: [],
      products: [],
    });
  });

  it('treats warranty lists as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWarranties } = await import('@/hooks/warranty/core/use-warranties');

    const { result } = renderHook(() => useWarranties(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      warranties: [],
      total: 0,
    });
  });

  it('treats warranty status counts as always-shaped and accepts zero success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWarrantyStatusCounts } = await import('@/hooks/warranty/core/use-warranties');

    const { result } = renderHook(() => useWarrantyStatusCounts(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      all: 0,
      expiring_soon: 0,
      expired: 0,
    });
  });

  it('preserves not-found semantics for warranty detail reads', async () => {
    mockGetWarranty.mockRejectedValueOnce({
      message: 'Warranty not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWarranty } = await import('@/hooks/warranty/core/use-warranties');

    const { result } = renderHook(() => useWarranty({ id: 'missing-warranty' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested warranty could not be found.',
    });
  });

  it('treats expiring warranty lists and reports as always-shaped', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useExpiringWarranties, useExpiringWarrantiesReport } = await import(
      '@/hooks/warranty/core/use-expiring-warranties'
    );

    const expiring = renderHook(() => useExpiringWarranties(), {
      wrapper: createWrapper(queryClient),
    });
    const report = renderHook(() => useExpiringWarrantiesReport(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(expiring.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(report.result.current.isSuccess).toBe(true));
    expect(expiring.result.current.data).toEqual({
      warranties: [],
      totalCount: 0,
    });
    expect(report.result.current.data).toMatchObject({
      warranties: [],
      totalCount: 0,
      totalValue: 0,
    });
  });

  it('treats expiring warranty filter options as always-shaped', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useExpiringWarrantiesFilterOptions } = await import(
      '@/hooks/warranty/core/use-expiring-warranties'
    );

    const { result } = renderHook(() => useExpiringWarrantiesFilterOptions(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      customers: [],
      products: [],
    });
  });
});
