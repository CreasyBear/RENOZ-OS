import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('approval mutation lifecycle contract', () => {
  it('awaits dashboard decision handlers before closing dialogs', () => {
    const dashboard = read('src/components/domain/approvals/approval-dashboard.tsx');
    const decisionDialog = read('src/components/domain/approvals/approval-decision-dialog.tsx');
    const bulkDialog = read('src/components/domain/approvals/bulk-approval-dialog.tsx');

    const decisionAwait = dashboard.indexOf('await onDecision(decision, data);');
    const decisionClose = dashboard.indexOf('onDecisionDialogOpenChange(false);', decisionAwait);
    const bulkAwait = dashboard.indexOf(
      'await onBulkDecision(decision, comments, selectedItems, rejectionReason);'
    );
    const bulkClose = dashboard.indexOf('setBulkDialogOpen(false);', bulkAwait);

    expect(decisionDialog).toContain(
      'reason?: ApprovalRejectionReason;'
    );
    expect(bulkDialog).toContain(
      'rejectionReason?: ApprovalRejectionReason'
    );
    expect(decisionAwait).toBeGreaterThan(-1);
    expect(decisionClose).toBeGreaterThan(decisionAwait);
    expect(bulkAwait).toBeGreaterThan(-1);
    expect(bulkClose).toBeGreaterThan(bulkAwait);
  });

  it('keeps route-level approval mutations from swallowing raw failures', () => {
    const route = read('src/routes/_authenticated/approvals/approvals-page.tsx');

    expect(route).toContain('useBulkReject,');
    expect(route).toContain('const bulkRejectMutation = useBulkReject();');
    expect(route).toContain('bulkRejectMutation.mutateAsync(');
    expect(route).toContain('const { data, isLoading, error, refetch } = usePendingApprovals');
    expect(route).toContain('void refetch();');
    expect(route).toContain("comments: ['Bulk rejection comments are required.']");
    expect(route).not.toContain('useQueryClient');
    expect(route).not.toContain('queryKeys.approvals.all');
    expect(route).not.toContain('invalidateQueries');
    expect(route).not.toContain("description: err instanceof Error ? err.message : 'An error occurred'");
    expect(route).not.toContain('catch (err)');
    expect(route).not.toContain('Bulk reject would need a different approach');
  });

  it('preserves approval rejection reasons through single and bulk mutation paths', () => {
    const route = read('src/routes/_authenticated/approvals/approvals-page.tsx');
    const dashboard = read('src/components/domain/approvals/approval-dashboard.tsx');
    const singleDialog = read('src/components/domain/approvals/approval-decision-dialog.tsx');
    const bulkDialog = read('src/components/domain/approvals/bulk-approval-dialog.tsx');

    expect(singleDialog).toContain('approvalRejectionReasonLabels');
    expect(singleDialog).toContain('approvalRejectionReasons.map');
    expect(singleDialog).toContain('reason: selectedRejectionReason');
    expect(bulkDialog).toContain('approvalRejectionReasonLabels');
    expect(bulkDialog).toContain('approvalRejectionReasons.map');
    expect(bulkDialog).toContain('rejectionReason || undefined');
    expect(dashboard).toContain(
      'await onBulkDecision(decision, comments, selectedItems, rejectionReason);'
    );
    expect(route).toContain("reason: ['Select a rejection reason.']");
    expect(route).toContain('reason: data.reason,');
    expect(route).toContain('reason: rejectionReason,');
    expect(route).not.toContain("reason: 'other' as ApprovalRejectionReason");
  });

  it('keeps approval dialog catches on the safe mutation formatter', () => {
    const singleDialog = read('src/components/domain/approvals/approval-decision-dialog.tsx');
    const bulkDialog = read('src/components/domain/approvals/bulk-approval-dialog.tsx');

    expect(singleDialog).toContain(
      "toastError(formatApprovalDecisionMutationError(error, 'singleDecision'))"
    );
    expect(bulkDialog).toContain(
      "toastError(formatApprovalDecisionMutationError(error, 'bulkDecision'))"
    );
    expect(singleDialog).not.toContain('toast.error');
    expect(bulkDialog).not.toContain('toast.error');
  });
});
