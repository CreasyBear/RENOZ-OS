import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('escalation dialog feedback contract', () => {
  it('keeps mutation failure feedback out of the presenter dialog', () => {
    const dialog = read('src/components/domain/support/escalation/escalation-dialog.tsx');
    const issueDetail = read('src/hooks/support/use-issue-detail.ts');

    expect(issueDetail).toContain(
      "toast.error(formatSupportMutationError(err, 'Failed to escalate'))"
    );
    expect(issueDetail).toContain(
      "toast.error(formatSupportMutationError(err, 'Failed to de-escalate'))"
    );

    expect(dialog).toContain('Mutation feedback is owned by the submit caller');
    expect(dialog).not.toContain('toast.error(');
    expect(dialog).not.toContain("error instanceof Error ? error.message");
    expect(dialog).not.toContain("err instanceof Error ? err.message");
    expect(dialog).not.toContain('duplicate key');
  });
});
