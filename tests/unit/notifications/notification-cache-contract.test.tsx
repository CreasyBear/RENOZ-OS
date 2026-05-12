import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const mockMarkNotificationRead = vi.fn();

vi.mock('@/server/functions/notifications', () => ({
  listNotifications: vi.fn(),
  markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'NotificationCacheContractWrapper';
  return Wrapper;
}

describe('notification cache contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes mark-read notification families without notification root invalidation', async () => {
    mockMarkNotificationRead.mockResolvedValue({ success: true });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useMarkNotificationRead } = await import(
      '@/hooks/notifications/use-notifications'
    );

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('notification-1');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.notifications.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.notifications.unread(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.notifications.count(),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.notifications.all,
    });
  });
});
