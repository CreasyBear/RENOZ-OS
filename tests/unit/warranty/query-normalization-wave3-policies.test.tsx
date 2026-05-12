import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const mockListWarrantyPolicies = vi.fn();
const mockGetWarrantyPoliciesWithSla = vi.fn();
const mockGetWarrantyPolicy = vi.fn();
const mockGetDefaultWarrantyPolicy = vi.fn();
const mockResolveWarrantyPolicy = vi.fn();
const mockAssignWarrantyPolicyToProduct = vi.fn();

vi.mock('@/server/functions/warranty/policies/warranty-policies', () => ({
  listWarrantyPolicies: (...args: unknown[]) => mockListWarrantyPolicies(...args),
  getWarrantyPoliciesWithSla: (...args: unknown[]) => mockGetWarrantyPoliciesWithSla(...args),
  getWarrantyPolicy: (...args: unknown[]) => mockGetWarrantyPolicy(...args),
  getDefaultWarrantyPolicy: (...args: unknown[]) => mockGetDefaultWarrantyPolicy(...args),
  resolveWarrantyPolicy: (...args: unknown[]) => mockResolveWarrantyPolicy(...args),
  createWarrantyPolicy: vi.fn(),
  updateWarrantyPolicy: vi.fn(),
  deleteWarrantyPolicy: vi.fn(),
  setDefaultWarrantyPolicy: vi.fn(),
  seedDefaultWarrantyPolicies: vi.fn(),
  assignWarrantyPolicyToProduct: (...args: unknown[]) => mockAssignWarrantyPolicyToProduct(...args),
  assignDefaultWarrantyPolicyToCategory: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'WarrantyPoliciesQueryNormalizationWave3Wrapper';
  return Wrapper;
}

describe('warranty policy query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListWarrantyPolicies.mockResolvedValue([]);
    mockGetWarrantyPoliciesWithSla.mockResolvedValue([]);
    mockGetWarrantyPolicy.mockResolvedValue({
      id: 'policy-1',
      name: 'Standard Policy',
      type: 'installation_workmanship',
    });
    mockGetDefaultWarrantyPolicy.mockResolvedValue(null);
    mockResolveWarrantyPolicy.mockResolvedValue({
      policy: null,
      source: null,
    });
    mockAssignWarrantyPolicyToProduct.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      warrantyPolicyId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('treats policy lists as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWarrantyPolicies, useWarrantyPoliciesWithSla } = await import(
      '@/hooks/warranty/policies/use-warranty-policies'
    );

    const policies = renderHook(() => useWarrantyPolicies(), {
      wrapper: createWrapper(queryClient),
    });
    const policiesWithSla = renderHook(() => useWarrantyPoliciesWithSla(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(policies.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(policiesWithSla.result.current.isSuccess).toBe(true));
    expect(policies.result.current.data).toEqual([]);
    expect(policiesWithSla.result.current.data).toEqual([]);
  });

  it('preserves not-found semantics for warranty policy detail reads', async () => {
    mockGetWarrantyPolicy.mockRejectedValueOnce({
      message: 'Warranty policy not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWarrantyPolicy } = await import('@/hooks/warranty/policies/use-warranty-policies');

    const { result } = renderHook(() => useWarrantyPolicy('missing-policy'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested warranty policy could not be found.',
    });
  });

  it('keeps default warranty policy as a nullable success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useDefaultWarrantyPolicy } = await import(
      '@/hooks/warranty/policies/use-warranty-policies'
    );

    const { result } = renderHook(
      () => useDefaultWarrantyPolicy('installation_workmanship'),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('treats warranty policy resolution as an always-shaped result', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useResolveWarrantyPolicy } = await import(
      '@/hooks/warranty/policies/use-warranty-policies'
    );

    const { result } = renderHook(
      () =>
        useResolveWarrantyPolicy({
          type: 'installation_workmanship',
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      policy: null,
      source: null,
    });
  });

  it('refreshes only affected product and warranty resolution caches after assigning a policy', async () => {
    const productId = '11111111-1111-4111-8111-111111111111';
    const policyId = '22222222-2222-4222-8222-222222222222';
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useAssignWarrantyPolicyToProduct } = await import(
      '@/hooks/warranty/policies/use-warranty-policies'
    );

    const { result } = renderHook(() => useAssignWarrantyPolicyToProduct(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ productId, policyId });
    });

    expect(mockAssignWarrantyPolicyToProduct).toHaveBeenCalledWith({
      data: { productId, policyId },
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.detail(productId),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.searches(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.warrantyPolicies.resolutions(),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.products.all,
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.products.stock(),
    });
  });
});
