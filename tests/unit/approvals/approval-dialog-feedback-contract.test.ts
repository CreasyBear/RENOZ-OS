import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatApprovalDecisionMutationError } from '@/hooks/suppliers/approval-mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('approval dialog mutation feedback', () => {
  it('suppresses unsafe approval decision failures', () => {
    expect(
      formatApprovalDecisionMutationError(
        new Error('duplicate key value violates unique constraint purchase_order_approvals_pkey'),
        'singleDecision'
      )
    ).toBe('Unable to submit approval decision. Refresh and try again.');

    expect(
      formatApprovalDecisionMutationError(
        {
          statusCode: 500,
          message: 'TypeError: Cannot read properties of undefined (reading approvalId)',
        },
        'bulkDecision'
      )
    ).toBe('Unable to submit bulk approval decision. Refresh and try again.');
  });

  it('keeps safe approval codes and validation copy useful for operators', () => {
    expect(
      formatApprovalDecisionMutationError(
        { statusCode: 404, code: 'NOT_FOUND' },
        'singleDecision'
      )
    ).toBe(
      'This approval request could not be found or has already been processed. Refresh and try again.'
    );

    expect(
      formatApprovalDecisionMutationError(
        { statusCode: 400, errors: { comments: ['Approval comments are required.'] } },
        'bulkDecision'
      )
    ).toBe('Approval comments are required.');
  });

  it('keeps approval dialogs on the approval formatter contract', () => {
    const formatter = read('src/hooks/suppliers/approval-mutation-errors.ts');
    const singleDialog = read('src/components/domain/approvals/approval-decision-dialog.tsx');
    const bulkDialog = read('src/components/domain/approvals/bulk-approval-dialog.tsx');

    expect(formatter).toContain('formatApprovalDecisionMutationError');
    expect(singleDialog).toContain(
      "formatApprovalDecisionMutationError(error, 'singleDecision')"
    );
    expect(bulkDialog).toContain("formatApprovalDecisionMutationError(error, 'bulkDecision')");
    expect(singleDialog).not.toContain(
      "error instanceof Error ? error.message : 'Failed to submit decision'"
    );
    expect(bulkDialog).not.toContain(
      "error instanceof Error ? error.message : 'Failed to submit bulk decision'"
    );
  });
});
