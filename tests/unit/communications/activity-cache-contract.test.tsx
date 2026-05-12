import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const mockUseServerFn = vi.fn((fn: unknown) => fn);
const mockCreateQuickLog = vi.fn();
const mockCompleteCall = vi.fn();

vi.mock('@tanstack/react-start', () => ({
  useServerFn: (fn: unknown) => mockUseServerFn(fn),
}));

vi.mock('@/server/functions/communications/quick-log', () => ({
  createQuickLog: (...args: unknown[]) => mockCreateQuickLog(...args),
}));

vi.mock('@/server/functions/communications/scheduled-calls', () => ({
  getScheduledCalls: vi.fn(),
  getScheduledCallById: vi.fn(),
  scheduleCall: vi.fn(),
  updateScheduledCall: vi.fn(),
  cancelScheduledCall: vi.fn(),
  rescheduleCall: vi.fn(),
  completeCall: (...args: unknown[]) => mockCompleteCall(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'CommunicationActivityCacheContractWrapper';
  return Wrapper;
}

describe('communications activity cache contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes quick-log activity surfaces without activity root invalidation', async () => {
    mockCreateQuickLog.mockResolvedValue({ activityId: 'activity-1' });

    const customerId = '550e8400-e29b-41d4-a716-446655440000';
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useCreateQuickLog } = await import('@/hooks/communications/use-quick-log');

    const { result } = renderHook(() => useCreateQuickLog(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        type: 'call',
        notes: 'Checked battery order timing',
        customerId,
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.feeds(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.statsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.leaderboards(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.byCustomer(customerId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.unifiedActivities.entityAudit('customer', customerId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.unifiedActivities.entityAuditWithRelated('customer', customerId, null),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.communications.customerCommunications(customerId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.communications.scheduledCalls(),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.activities.all,
    });
  });

  it('refreshes completed-call activity surfaces from returned customer identity', async () => {
    mockCompleteCall.mockResolvedValue({
      id: 'call-1',
      customerId: '550e8400-e29b-41d4-a716-446655440000',
    });

    const customerId = '550e8400-e29b-41d4-a716-446655440000';
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useCompleteCall } = await import('@/hooks/communications/use-scheduled-calls');

    const { result } = renderHook(() => useCompleteCall(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'call-1',
        outcome: 'answered',
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.communications.scheduledCalls(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.communications.scheduledCallDetail('call-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.feeds(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.activities.byCustomer(customerId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.communications.customerCommunications(customerId),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.activities.all,
    });
  });
});
