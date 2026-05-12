import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'ActivityCacheContractWrapper';
  return Wrapper;
}

describe('activity cache contract', () => {
  it('invalidates activity query families without activity root invalidation', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useInvalidateActivities } = await import('@/hooks/activities/use-activities');

    const { result } = renderHook(() => useInvalidateActivities(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.all();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.feeds(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.details(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.customers(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.opportunities(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.entities(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.users(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.statsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.leaderboards(),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.activities.all,
    });
  });

  it('invalidates activity stats prefixes without cache predicate scanning', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useInvalidateActivities } = await import('@/hooks/activities/use-activities');

    const { result } = renderHook(() => useInvalidateActivities(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.stats();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.statsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.leaderboards(),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function) })
    );
  });
});
