import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseServerFn = vi.fn((fn: unknown) => fn);
const mockGetServiceSystem = vi.fn();
const mockListServiceSystems = vi.fn();
const mockListServiceLinkageReviews = vi.fn();
const mockGetServiceLinkageReview = vi.fn();

vi.mock('@tanstack/react-start', () => ({
  useServerFn: (fn: unknown) => mockUseServerFn(fn),
}));

vi.mock('@/server/functions/service', () => ({
  getServiceSystem: (...args: unknown[]) => mockGetServiceSystem(...args),
  listServiceSystems: (...args: unknown[]) => mockListServiceSystems(...args),
  listServiceLinkageReviews: (...args: unknown[]) => mockListServiceLinkageReviews(...args),
  getServiceLinkageReview: (...args: unknown[]) => mockGetServiceLinkageReview(...args),
  resolveServiceLinkageReview: vi.fn(),
  transferServiceSystemOwnership: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'ServiceQueryNormalizationWave1Wrapper';
  return Wrapper;
}

describe('service query normalization wave 1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListServiceSystems.mockResolvedValue({ items: [] });
    mockGetServiceSystem.mockResolvedValue({ id: 'system-1', displayName: 'Main System' });
    mockListServiceLinkageReviews.mockResolvedValue({ reviews: [] });
    mockGetServiceLinkageReview.mockResolvedValue({ id: 'review-1', status: 'pending' });
  });

  it('treats service system lists as always-shaped and accepts empty items', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useServiceSystems } = await import('@/hooks/service/use-service-systems');

    const { result } = renderHook(() => useServiceSystems(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.data).toEqual({ items: [] }));
  });

  it('preserves not-found semantics for service system detail reads', async () => {
    mockGetServiceSystem.mockRejectedValueOnce({
      message: 'Service system not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useServiceSystem } = await import('@/hooks/service/use-service-systems');

    const { result } = renderHook(() => useServiceSystem('missing-system'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested service system could not be found.',
    });
  });
});
