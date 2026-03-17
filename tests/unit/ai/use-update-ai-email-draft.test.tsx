import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useUpdateAIEmailDraft', () => {
  const customerId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('patches the approval draft and returns the updated approval payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          approval: {
            id: 'approval-1',
            action: 'send_email',
            agent: 'customer',
            actionData: {
              actionType: 'send_email',
              availableActions: ['approve', 'edit', 'discard'],
              draft: {
                customerId,
                to: 'customer@example.com',
                subject: 'Updated subject',
                body: 'Updated body',
              },
            },
            version: 5,
            status: 'pending',
            createdAt: '2026-03-16T00:00:00.000Z',
            expiresAt: '2026-03-17T00:00:00.000Z',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { useUpdateAIEmailDraft } = await import('@/hooks/ai/use-ai-approvals');
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateAIEmailDraft(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        approvalId: 'approval-1',
        expectedVersion: 4,
        draft: {
          customerId,
          to: 'customer@example.com',
          subject: 'Updated subject',
          body: 'Updated body',
        },
      });
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/ai/approvals/approval-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        draft: {
          customerId,
          to: 'customer@example.com',
          subject: 'Updated subject',
          body: 'Updated body',
        },
        expectedVersion: 4,
      }),
    });
  });
});
