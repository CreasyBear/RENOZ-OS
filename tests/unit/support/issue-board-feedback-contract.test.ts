import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('issue board feedback contract', () => {
  it('formats board mutation failures before display', () => {
    const board = read('src/routes/_authenticated/support/issues-board.tsx');
    const helper = read('src/components/domain/support/issues/issue-board-feedback.ts');

    expect(board).not.toContain("import { toast } from 'sonner'");
    expect(board).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(board).toContain(
      "formatIssueBoardMutationError(err, 'Failed to update issue status')"
    );
    expect(board).toContain('formatIssueBoardTransitionFailureToast(issueLabel, message)');
    expect(board).toContain(
      "formatIssueBoardMutationError(result.reason, 'Failed to update issue')"
    );
    expect(board).toContain('toast.error(formatIssueBoardBulkFailureToast(failureItems))');
    expect(board).toContain("formatIssueBoardMutationError(err, 'Failed to update issues')");
    expect(board).not.toContain(
      "err instanceof Error ? err.message : 'Failed to update issue status'"
    );
    expect(board).not.toContain('result.reason instanceof Error ? result.reason.message');
    expect(board).not.toContain("err instanceof Error ? err.message : 'Failed to update issues'");

    expect(helper).toContain(
      "import { formatSupportMutationError } from '@/hooks/support/_mutation-errors'"
    );
    expect(helper).toContain('ISSUE_BOARD_LOCAL_MESSAGES');
  });
});
