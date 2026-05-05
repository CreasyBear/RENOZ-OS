import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toBulkApprovalFailure } from '@/server/functions/suppliers/approval-failure';
import {
  AuthError,
  NotFoundError,
  ValidationError,
} from '@/lib/server/errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('bulk approval failure normalization', () => {
  it('does not serialize unsafe infrastructure messages as row reasons', () => {
    expect(
      toBulkApprovalFailure(
        'approval-1',
        new Error('duplicate key value violates unique constraint purchase_order_approvals_pkey')
      )
    ).toEqual({
      id: 'approval-1',
      reason: 'This approval request could not be approved. Refresh and try again.',
    });

    expect(
      toBulkApprovalFailure(
        'approval-1',
        new ValidationError('Internal server error: database stack trace')
      )
    ).toEqual({
      id: 'approval-1',
      reason: 'This approval request could not be approved. Refresh and try again.',
    });
  });

  it('keeps safe typed approval row reasons', () => {
    expect(toBulkApprovalFailure('approval-1', new NotFoundError())).toEqual({
      id: 'approval-1',
      reason:
        'This approval request could not be found or has already been processed. Refresh and try again.',
    });

    expect(toBulkApprovalFailure('approval-1', new AuthError())).toEqual({
      id: 'approval-1',
      reason: 'You do not have permission to approve this purchase order.',
    });

    expect(
      toBulkApprovalFailure(
        'approval-1',
        new ValidationError('Approval comments are required.')
      )
    ).toEqual({
      id: 'approval-1',
      reason: 'Approval comments are required.',
    });
  });

  it('keeps bulk approval server row failures on the normalizer', () => {
    const source = read('src/server/functions/suppliers/approvals.ts');

    expect(source).toContain(
      "import { toBulkApprovalFailure, type BulkApprovalFailure } from './approval-failure';"
    );
    expect(source).toContain('failed: [] as BulkApprovalFailure[],');
    expect(source).toContain('results.failed.push(toBulkApprovalFailure(approvalId, error));');
    expect(source).not.toContain("error instanceof Error ? error.message : 'Processing error'");
  });
});
