import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('issue detail mutation feedback contract', () => {
  it('keeps issue detail mutation feedback on the shared formatter and toast adapter', () => {
    const source = read('src/hooks/support/use-issue-detail.ts');

    expect(source).not.toContain("import { toast } from 'sonner'");
    expect(source).toContain("import { toast } from '@/hooks/_shared/use-toast'");
    expect(source).toContain("import { formatSupportMutationError } from './_mutation-errors'");
    expect(source).toContain(
      "toast.error(formatSupportMutationError(err, 'Failed to update issue status'))"
    );
    expect(source).toContain(
      "toast.error(formatSupportMutationError(error, 'Failed to delete issue'))"
    );
    expect(source).toContain("toast.error(formatSupportMutationError(err, 'Failed to escalate'))");
    expect(source).toContain(
      "toast.error(formatSupportMutationError(err, 'Failed to de-escalate'))"
    );
    expect(source).not.toContain(
      "err instanceof Error ? err.message : 'Failed to update issue status'"
    );
    expect(source).not.toContain(
      "error instanceof Error ? error.message : 'Failed to delete issue'"
    );
    expect(source).not.toContain("err instanceof Error ? err.message : 'Failed to escalate'");
    expect(source).not.toContain("err instanceof Error ? err.message : 'Failed to de-escalate'");
  });
});
