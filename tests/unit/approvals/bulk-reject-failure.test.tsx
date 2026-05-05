import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatApprovalBulkFailureReason } from '@/hooks/suppliers/approval-mutation-errors';

const mockRejectPurchaseOrderAtLevel = vi.fn();

vi.mock('@/server/functions/suppliers/approvals', () => ({
  listPendingApprovals: vi.fn(),
  getApprovalDetails: vi.fn(),
  getApprovalHistory: vi.fn(),
  getApprovalStats: vi.fn(),
  approvePurchaseOrderAtLevel: vi.fn(),
  rejectPurchaseOrderAtLevel: (...args: unknown[]) => mockRejectPurchaseOrderAtLevel(...args),
  bulkApproveApprovals: vi.fn(),
  escalateApproval: vi.fn(),
  delegateApproval: vi.fn(),
  revokeDelegation: vi.fn(),
  evaluateApprovalRules: vi.fn(),
}));

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'BulkRejectFailureWrapper';
  return Wrapper;
}

describe('bulk reject failure normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not return unsafe row reasons from useBulkReject', async () => {
    mockRejectPurchaseOrderAtLevel.mockRejectedValueOnce(
      new Error('duplicate key value violates unique constraint purchase_order_approvals_pkey')
    );

    const queryClient = new QueryClient();
    const { useBulkReject } = await import('@/hooks/suppliers/use-approvals');
    const { result } = renderHook(() => useBulkReject(), {
      wrapper: createWrapper(queryClient),
    });

    const response = await act(async () =>
      result.current.mutateAsync([
        {
          approvalId: '11111111-1111-4111-8111-111111111111',
          reason: 'needs_budget_approval',
          comments: 'Budget threshold exceeded.',
        },
      ])
    );

    expect(response).toEqual({
      rejected: [],
      failed: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          reason: 'Could not update this approval request',
        },
      ],
    });
  });

  it('keeps approval-specific typed row reasons', () => {
    expect(
      formatApprovalBulkFailureReason({
        code: 'NOT_FOUND',
        statusCode: 404,
        message: 'Approval not found or already processed',
      })
    ).toBe(
      'This approval request could not be found or has already been processed. Refresh and try again.'
    );
  });

  it('keeps useBulkReject on the approval formatter', () => {
    const source = read('src/hooks/suppliers/use-approvals.ts');

    expect(source).toContain(
      "import { formatApprovalBulkFailureReason } from './approval-mutation-errors';"
    );
    expect(source).toContain('reason: formatApprovalBulkFailureReason(error),');
    expect(source).not.toContain("reason: error instanceof Error ? error.message : 'Unknown error'");
  });
});
