import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mutateAsync = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/hooks/activities/use-activities', () => ({
  useLogEntityActivity: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks', () => ({
  toastSuccess: (...args: unknown[]) => toastSuccess(...args),
  toastError: (...args: unknown[]) => toastError(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  Wrapper.displayName = 'UseEntityActivityLoggingWrapper';
  return Wrapper;
}

describe('useEntityActivityLogging', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it('rethrows mutation failures after showing an error toast', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('Save failed'));

    const { useEntityActivityLogging } = await import('@/hooks/activities/use-entity-activity-logging');
    const { result } = renderHook(
      () =>
        useEntityActivityLogging({
          entityType: 'order',
          entityId: '64f93295-5ed4-4ca2-9717-735039132698',
          entityLabel: 'Order ORD-20260407-0001',
        }),
      { wrapper: createWrapper() }
    );

    await expect(
      result.current.loggerProps.onSubmit({
        type: 'note',
        description: 'Configured standby timeout to 1440 minutes.',
        title: 'Battery configuration updated',
        body: 'Configured standby timeout to 1440 minutes.',
        isFollowUp: false,
      })
    ).rejects.toThrow('Save failed');

    expect(toastError).toHaveBeenCalled();
  });

  it('keeps the dialog open after a successful submit so the success state can render', async () => {
    mutateAsync.mockResolvedValueOnce(undefined);

    const { useEntityActivityLogging } = await import('@/hooks/activities/use-entity-activity-logging');
    const { result } = renderHook(
      () =>
        useEntityActivityLogging({
          entityType: 'order',
          entityId: '64f93295-5ed4-4ca2-9717-735039132698',
          entityLabel: 'Order ORD-20260407-0001',
        }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.onLogActivity();
    });

    expect(result.current.loggerProps.open).toBe(true);

    await act(async () => {
      await result.current.loggerProps.onSubmit({
        type: 'note',
        description: 'Configured standby timeout to 1440 minutes.',
        title: 'Battery configuration updated',
        body: 'Configured standby timeout to 1440 minutes.',
        isFollowUp: false,
      });
    });

    expect(result.current.loggerProps.open).toBe(true);
    expect(toastSuccess).toHaveBeenCalledWith('Note logged for Order ORD-20260407-0001');
  });
});
