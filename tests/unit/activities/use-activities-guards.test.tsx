import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockGetEntityActivities = vi.fn();
const mockGetCustomerActivities = vi.fn();
const mockGetCustomerEmailActivities = vi.fn();
const mockGetActivityTimeline = vi.fn();

vi.mock('@/server/functions/activities/activities', () => ({
  getEntityActivities: (...args: unknown[]) => mockGetEntityActivities(...args),
}));

vi.mock('@/server/functions/customers/customers', () => ({
  getCustomerActivities: (...args: unknown[]) => mockGetCustomerActivities(...args),
}));

vi.mock('@/server/functions/communications/customer-communications', () => ({
  getCustomerEmailActivities: (...args: unknown[]) => mockGetCustomerEmailActivities(...args),
}));

vi.mock('@/server/functions/pipeline/pipeline', () => ({
  getActivityTimeline: (...args: unknown[]) => mockGetActivityTimeline(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'ActivitiesGuardWrapper';
  return Wrapper;
}

describe('activity hook guards', () => {
  it('useFlattenedActivities skips malformed pages instead of crashing', async () => {
    const { useFlattenedActivities } = await import('@/hooks/activities/use-activities');

    const { result } = renderHook(() =>
      useFlattenedActivities({
        data: {
          pages: [
            undefined,
            { items: [{ id: 'activity-1' }] },
            { items: null },
          ],
          pageParams: [],
        },
      } as never)
    );

    expect(result.current).toEqual([{ id: 'activity-1' }]);
  });

  it('useUnifiedActivities surfaces invalid entity activity payloads as query errors', async () => {
    mockGetEntityActivities.mockResolvedValue(undefined);
    mockGetCustomerActivities.mockResolvedValue([]);
    mockGetCustomerEmailActivities.mockResolvedValue([]);
    mockGetActivityTimeline.mockResolvedValue({ activities: [] });

    const { useUnifiedActivities } = await import('@/hooks/activities/use-unified-activities');

    const { result } = renderHook(
      () =>
        useUnifiedActivities({
          entityType: 'order',
          entityId: '64f93295-5ed4-4ca2-9717-735039132698',
          relatedCustomerId: '802b94f7-f58d-43e1-aa64-0af7950f2fd0',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });

    expect(result.current.activities).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('invalid response');
  });
});
