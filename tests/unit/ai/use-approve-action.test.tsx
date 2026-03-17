import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useApproveAction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces retryable delivery failures and still invalidates approval queries', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          code: 'DELIVERY_RETRY_REQUIRED',
          error: 'Approval was recorded, but email delivery failed. Retry approval to resend email.',
          retryAvailable: true,
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { useApproveAction } = await import('@/hooks/ai/use-ai-approvals');
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useApproveAction(), { wrapper });

    let thrown: Error | null = null;

    await act(async () => {
      try {
        await result.current.mutateAsync({
          approvalId: '11111111-1111-4111-8111-111111111111',
          expectedVersion: 2,
        });
      } catch (error) {
        thrown = error as Error;
      }
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/ai/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        approvalId: '11111111-1111-4111-8111-111111111111',
        action: 'approve',
        expectedVersion: 2,
      }),
    });
    expect(thrown).toBeInstanceOf(Error);
    if (!thrown) {
      throw new Error('Expected approve action to throw');
    }
    const approvalError: Error & { code?: string; retryAvailable?: boolean } = thrown;
    expect(approvalError.code).toBe('DELIVERY_RETRY_REQUIRED');
    expect(approvalError.retryAvailable).toBe(true);
    expect(invalidateQueriesSpy).toHaveBeenCalled();
  });
});
