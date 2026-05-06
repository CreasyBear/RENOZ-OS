import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks', () => ({
  toastError: vi.fn(),
}));

import { ApprovalDashboard } from '@/components/domain/approvals/approval-dashboard';
import {
  APPROVAL_DASHBOARD_READ_FALLBACK_MESSAGE,
  APPROVAL_DETAILS_READ_FALLBACK_MESSAGE,
  getApprovalDashboardReadErrorMessage,
  getApprovalDetailsReadErrorMessage,
} from '@/components/domain/approvals/approval-dashboard-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function renderApprovalDashboardError(error: unknown) {
  render(
    <ApprovalDashboard
      approvalItems={[]}
      isLoading={false}
      error={error}
      activeTab="pending"
      onActiveTabChange={vi.fn()}
      filters={{ type: 'all', priority: 'all', search: '' }}
      onFiltersChange={vi.fn()}
      onRefresh={vi.fn()}
      onDecision={vi.fn()}
      onBulkDecision={vi.fn()}
      escalationUsers={[]}
      selectedItem={null}
      onSelectedItemChange={vi.fn()}
      decisionDialogOpen={false}
      onDecisionDialogOpenChange={vi.fn()}
    />
  );
}

describe('approval read feedback contract', () => {
  it('keeps normalized approval read messages and hides arbitrary raw errors', () => {
    const normalizedDashboardError = normalizeReadQueryError(
      { code: 'NOT_FOUND', statusCode: 404 },
      {
        contractType: 'detail-not-found',
        fallbackMessage: APPROVAL_DASHBOARD_READ_FALLBACK_MESSAGE,
        notFoundMessage: 'The requested approval queue could not be found.',
      }
    );
    const normalizedDetailsError = normalizeReadQueryError(
      { code: 'NOT_FOUND', statusCode: 404 },
      {
        contractType: 'detail-not-found',
        fallbackMessage: APPROVAL_DETAILS_READ_FALLBACK_MESSAGE,
        notFoundMessage: 'The requested approval line items could not be found.',
      }
    );

    expect(getApprovalDashboardReadErrorMessage(normalizedDashboardError)).toBe(
      'The requested approval queue could not be found.'
    );
    expect(getApprovalDetailsReadErrorMessage(normalizedDetailsError)).toBe(
      'The requested approval line items could not be found.'
    );
    expect(
      getApprovalDashboardReadErrorMessage(
        new Error('duplicate key value violates unique constraint purchase_order_approvals_pkey')
      )
    ).toBe(APPROVAL_DASHBOARD_READ_FALLBACK_MESSAGE);
    expect(
      getApprovalDetailsReadErrorMessage(
        new Error('select from purchase_order_items violates row-level security policy')
      )
    ).toBe(APPROVAL_DETAILS_READ_FALLBACK_MESSAGE);
  });

  it('does not surface raw approval dashboard read errors', () => {
    renderApprovalDashboardError(
      new Error('duplicate key value violates unique constraint purchase_order_approvals_pkey')
    );

    expect(screen.getByText('Failed to load approvals')).toBeInTheDocument();
    expect(screen.getByText(APPROVAL_DASHBOARD_READ_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key value violates/i)).not.toBeInTheDocument();
  });

  it('keeps approval read-error UI behind the formatter contract', () => {
    const helper = read('src/components/domain/approvals/approval-dashboard-error-messages.ts');
    const dashboard = read('src/components/domain/approvals/approval-dashboard.tsx');
    const dialog = read('src/components/domain/approvals/approval-decision-dialog.tsx');

    expect(helper).toContain('getApprovalDashboardReadErrorMessage');
    expect(helper).toContain('getApprovalDetailsReadErrorMessage');
    expect(dashboard).toContain('message={getApprovalDashboardReadErrorMessage(error)}');
    expect(dialog).toContain('{getApprovalDetailsReadErrorMessage(approvalDetailsError)}');
    expect(dashboard).not.toContain('error instanceof Error ? error.message');
    expect(dashboard).not.toContain("'An unexpected error occurred'");
    expect(dialog).not.toContain('{approvalDetailsError.message}');
  });
});
