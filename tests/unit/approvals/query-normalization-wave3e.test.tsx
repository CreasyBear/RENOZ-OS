import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListPendingApprovals = vi.fn();
const mockGetApprovalDetails = vi.fn();
const mockGetApprovalHistory = vi.fn();
const mockGetApprovalStats = vi.fn();

vi.mock('@/server/functions/suppliers/approvals', () => ({
  listPendingApprovals: (...args: unknown[]) => mockListPendingApprovals(...args),
  getApprovalDetails: (...args: unknown[]) => mockGetApprovalDetails(...args),
  getApprovalHistory: (...args: unknown[]) => mockGetApprovalHistory(...args),
  getApprovalStats: (...args: unknown[]) => mockGetApprovalStats(...args),
  approvePurchaseOrderAtLevel: vi.fn(),
  rejectPurchaseOrderAtLevel: vi.fn(),
  bulkApproveApprovals: vi.fn(),
  escalateApproval: vi.fn(),
  delegateApproval: vi.fn(),
  revokeDelegation: vi.fn(),
  evaluateApprovalRules: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'ApprovalsQueryNormalizationWave3EWrapper';
  return Wrapper;
}

describe('approvals query normalization wave 3e', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListPendingApprovals.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mockGetApprovalDetails.mockResolvedValue({
      id: 'approval-1',
      purchaseOrderId: 'po-1',
      items: [],
    });
    mockGetApprovalHistory.mockResolvedValue({
      history: [],
    });
    mockGetApprovalStats.mockResolvedValue({
      pending: 0,
      approved: 0,
      rejected: 0,
      escalated: 0,
      total: 0,
      overdue: 0,
    });
  });

  it('treats pending approvals as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { usePendingApprovals } = await import('@/hooks/suppliers/use-approvals');

    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      items: [],
      pagination: { totalItems: 0 },
    });
  });

  it('preserves not-found semantics for approval detail reads', async () => {
    mockGetApprovalDetails.mockRejectedValueOnce({
      message: 'Approval not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useApprovalDetails } = await import('@/hooks/suppliers/use-approvals');

    const { result } = renderHook(() => useApprovalDetails('missing-approval'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested approval could not be found.',
    });
  });

  it('treats approval history as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useApprovalHistory } = await import('@/hooks/suppliers/use-approvals');

    const { result } = renderHook(() => useApprovalHistory('po-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ history: [] });
  });

  it('normalizes approval stats failures as always-shaped system errors', async () => {
    mockGetApprovalStats.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useMyApprovalStats } = await import('@/hooks/suppliers/use-approvals');

    const { result } = renderHook(() => useMyApprovalStats(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Approval stats are temporarily unavailable. Please refresh and try again.',
    });
  });
});
