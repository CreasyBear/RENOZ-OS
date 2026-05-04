import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListWarrantyExtensions = vi.fn();
const mockGetExtensionHistory = vi.fn();
const mockGetExtensionById = vi.fn();

vi.mock('@/server/functions/warranty/extensions/warranty-extensions', () => ({
  extendWarranty: vi.fn(),
  listWarrantyExtensions: (...args: unknown[]) => mockListWarrantyExtensions(...args),
  getExtensionHistory: (...args: unknown[]) => mockGetExtensionHistory(...args),
  getExtensionById: (...args: unknown[]) => mockGetExtensionById(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'WarrantyExtensionsQueryNormalizationWave3Wrapper';
  return Wrapper;
}

describe('warranty extension query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListWarrantyExtensions.mockResolvedValue({
      warrantyNumber: 'WAR-001',
      extensions: [],
    });
    mockGetExtensionHistory.mockResolvedValue({
      extensions: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    mockGetExtensionById.mockResolvedValue({
      id: 'extension-1',
      warrantyId: 'warranty-1',
      warrantyNumber: 'WAR-001',
      extensionType: 'manual',
      extensionMonths: 12,
      previousExpiryDate: '2026-01-01T00:00:00.000Z',
      newExpiryDate: '2027-01-01T00:00:00.000Z',
      price: null,
      notes: null,
      approvedById: null,
      createdAt: '2026-01-02T00:00:00.000Z',
      customerName: 'Acme Corp',
      productName: 'Heat Pump',
    });
  });

  it('treats warranty extension lists as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWarrantyExtensions } = await import(
      '@/hooks/warranty/extensions/use-warranty-extensions'
    );

    const { result } = renderHook(() => useWarrantyExtensions('warranty-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      warrantyNumber: 'WAR-001',
      extensions: [],
    });
  });

  it('treats warranty extension history as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useExtensionHistory } = await import(
      '@/hooks/warranty/extensions/use-warranty-extensions'
    );

    const { result } = renderHook(() => useExtensionHistory(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      extensions: [],
      total: 0,
    });
  });

  it('preserves not-found semantics for extension detail reads', async () => {
    mockGetExtensionById.mockRejectedValueOnce({
      message: 'Warranty extension not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useExtensionById } = await import(
      '@/hooks/warranty/extensions/use-warranty-extensions'
    );

    const { result } = renderHook(() => useExtensionById('missing-extension'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested warranty extension could not be found.',
    });
  });
});
