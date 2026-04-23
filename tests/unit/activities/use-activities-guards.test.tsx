import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockGetEntityActivities = vi.fn();
const mockGetCustomerActivities = vi.fn();
const mockGetCustomerEmailActivities = vi.fn();
const mockGetActivityTimeline = vi.fn();

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>(
    '@tanstack/react-start'
  );
  return {
    ...actual,
    useServerFn: (fn: unknown) => fn,
  };
});

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
    expect(result.current.error?.message).toContain('temporarily unavailable');
  });

  it('useUnifiedActivities accepts cursor-paginated audit activity payloads', async () => {
    mockGetEntityActivities.mockResolvedValue({
      items: [
        {
          id: 'activity-1',
          action: 'updated',
          entityType: 'order',
          entityId: '64f93295-5ed4-4ca2-9717-735039132698',
          description: 'Order updated',
          metadata: null,
          changes: null,
          createdAt: '2026-04-09T07:00:00.000Z',
          createdBy: 'user-1',
          userId: 'user-1',
          source: 'manual',
          entityName: 'ORD-20260407-0001',
          user: {
            id: 'user-1',
            name: 'Alice',
            email: 'alice@example.com',
          },
        },
      ],
      nextCursor: null,
      hasNextPage: false,
    });
    mockGetCustomerActivities.mockResolvedValue([]);
    mockGetCustomerEmailActivities.mockResolvedValue([]);
    mockGetActivityTimeline.mockResolvedValue({ activities: [] });

    const { useUnifiedActivities } = await import('@/hooks/activities/use-unified-activities');

    const { result } = renderHook(
      () =>
        useUnifiedActivities({
          entityType: 'order',
          entityId: '64f93295-5ed4-4ca2-9717-735039132698',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.activities).toHaveLength(1);
    });

    expect(result.current.hasError).toBe(false);
    expect(result.current.activities[0]?.description).toContain('Order updated');
  });

  it('useUnifiedActivities unwraps nested server-fn payloads for audit activities', async () => {
    mockGetEntityActivities.mockResolvedValue({
      result: {
        items: [
          {
            id: 'activity-2',
            action: 'created',
            entityType: 'order',
            entityId: '64f93295-5ed4-4ca2-9717-735039132698',
            description: 'Order created',
            metadata: null,
            changes: null,
            createdAt: '2026-04-09T07:30:00.000Z',
            createdBy: 'user-2',
            userId: 'user-2',
            source: 'manual',
            entityName: 'ORD-20260407-0001',
            user: {
              id: 'user-2',
              name: 'Bob',
              email: 'bob@example.com',
            },
          },
        ],
        nextCursor: null,
        hasNextPage: false,
      },
    });
    mockGetCustomerActivities.mockResolvedValue([]);
    mockGetCustomerEmailActivities.mockResolvedValue([]);
    mockGetActivityTimeline.mockResolvedValue({ activities: [] });

    const { useUnifiedActivities } = await import('@/hooks/activities/use-unified-activities');

    const { result } = renderHook(
      () =>
        useUnifiedActivities({
          entityType: 'order',
          entityId: '64f93295-5ed4-4ca2-9717-735039132698',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.activities).toHaveLength(1);
    });

    expect(result.current.hasError).toBe(false);
    expect(result.current.activities[0]?.description).toContain('Order created');
  });
});
