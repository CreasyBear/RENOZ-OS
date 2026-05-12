import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const mockBulkUpdateOpportunityStage = vi.fn();

vi.mock('@/server/functions/pipeline/pipeline', () => ({
  createOpportunity: vi.fn(),
  updateOpportunity: vi.fn(),
  updateOpportunityStage: vi.fn(),
  bulkUpdateOpportunityStage: (...args: unknown[]) =>
    mockBulkUpdateOpportunityStage(...args),
  deleteOpportunity: vi.fn(),
  convertToOrder: vi.fn(),
  listOpportunities: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'OpportunityBulkStageCacheContractWrapper';
  return Wrapper;
}

describe('pipeline bulk stage cache contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes affected opportunity details without pipeline root invalidation', async () => {
    mockBulkUpdateOpportunityStage.mockResolvedValue({
      updated: ['opp-1', 'opp-2'],
      failed: [],
    });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useBulkUpdateOpportunityStage } = await import(
      '@/hooks/pipeline/use-opportunity-mutations'
    );

    const { result } = renderHook(() => useBulkUpdateOpportunityStage(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        opportunityIds: ['opp-1', 'opp-2'],
        stage: 'proposal',
        probability: 60,
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.opportunities.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.opportunities.infiniteLists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.pipeline.metrics(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.pipeline.opportunity('opp-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.pipeline.opportunity('opp-2'),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.pipeline.all,
    });
  });
});
