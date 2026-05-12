import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const mockBulkApproveApprovals = vi.fn();
const mockRejectPurchaseOrderAtLevel = vi.fn();
const mockEvaluateApprovalRules = vi.fn();

vi.mock('@/server/functions/suppliers/approvals', () => ({
  listPendingApprovals: vi.fn(),
  getApprovalDetails: vi.fn(),
  getApprovalHistory: vi.fn(),
  getApprovalStats: vi.fn(),
  approvePurchaseOrderAtLevel: vi.fn(),
  rejectPurchaseOrderAtLevel: (...args: unknown[]) => mockRejectPurchaseOrderAtLevel(...args),
  bulkApproveApprovals: (...args: unknown[]) => mockBulkApproveApprovals(...args),
  escalateApproval: vi.fn(),
  delegateApproval: vi.fn(),
  revokeDelegation: vi.fn(),
  evaluateApprovalRules: (...args: unknown[]) => mockEvaluateApprovalRules(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'ApprovalCacheContractWrapper';
  return Wrapper;
}

describe('approval mutation cache contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes bulk-approve approval surfaces without approval root invalidation', async () => {
    const approvalId = '11111111-1111-4111-8111-111111111111';
    mockBulkApproveApprovals.mockResolvedValue({ approved: [approvalId], failed: [] });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useBulkApprove } = await import('@/hooks/suppliers/use-approvals');

    const { result } = renderHook(() => useBulkApprove(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        approvalIds: [approvalId],
        comments: 'Approved for production order timing.',
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.stats(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.detail(approvalId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.suppliers.purchaseOrders(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.suppliers.pendingApprovals(),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.all,
    });
  });

  it('refreshes bulk-reject approval surfaces without approval root invalidation', async () => {
    const approvalId = '22222222-2222-4222-8222-222222222222';
    mockRejectPurchaseOrderAtLevel.mockResolvedValue({ success: true });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useBulkReject } = await import('@/hooks/suppliers/use-approvals');

    const { result } = renderHook(() => useBulkReject(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync([
        {
          approvalId,
          reason: 'needs_budget_approval',
          comments: 'Supplier quote needs a margin review.',
        },
      ]);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.stats(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.detail(approvalId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.suppliers.purchaseOrders(),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.all,
    });
  });

  it('refreshes approval rule evaluation surfaces without approval root invalidation', async () => {
    const purchaseOrderId = '33333333-3333-4333-8333-333333333333';
    mockEvaluateApprovalRules.mockResolvedValue({ created: 1 });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useEvaluateApprovalRules } = await import('@/hooks/suppliers/use-approvals');

    const { result } = renderHook(() => useEvaluateApprovalRules(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(purchaseOrderId);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.stats(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.history(purchaseOrderId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.suppliers.purchaseOrders(),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.all,
    });
  });
});
