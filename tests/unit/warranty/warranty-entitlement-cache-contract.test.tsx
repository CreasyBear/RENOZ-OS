import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const mockActivateWarrantyFromEntitlement = vi.fn();

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>(
    '@tanstack/react-start'
  );
  return {
    ...actual,
    useServerFn: <T,>(fn: T) => fn,
  };
});

vi.mock('@/server/functions/warranty', () => ({
  listWarrantyEntitlements: vi.fn(),
  getWarrantyEntitlement: vi.fn(),
  activateWarrantyFromEntitlement: (...args: unknown[]) =>
    mockActivateWarrantyFromEntitlement(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'WarrantyEntitlementCacheContractWrapper';
  return Wrapper;
}

describe('warranty entitlement cache contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActivateWarrantyFromEntitlement.mockResolvedValue({
      entitlementId: 'entitlement-1',
      warrantyId: 'warranty-1',
      warrantyNumber: 'WAR-001',
      message: 'Warranty WAR-001 activated.',
    });
  });

  it('refreshes activated entitlement and warranty identity without root invalidation', async () => {
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useActivateWarrantyFromEntitlement } = await import(
      '@/hooks/warranty/entitlements/use-warranty-entitlements'
    );

    const { result } = renderHook(() => useActivateWarrantyFromEntitlement(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        entitlementId: 'entitlement-1',
        activationDate: '2026-05-12',
        owner: {
          fullName: 'Site Owner',
          email: 'owner@example.com',
        },
      });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.warrantyEntitlements.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.warrantyEntitlements.detail('entitlement-1'),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.warranties.lists(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.warranties.detail('warranty-1'),
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.warrantyEntitlements.all,
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.warranties.all,
    });
  });
});
