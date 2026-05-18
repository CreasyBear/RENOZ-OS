import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('support issue board read-state contract', () => {
  it('keeps issue board read errors operator-safe', () => {
    const board = read('src/routes/_authenticated/support/issues-board.tsx');
    const formatter = read('src/lib/support/read-error-messages.ts');
    const hook = read('src/hooks/support/use-issues.ts');
    const queryKeys = read('src/lib/query-key-catalog/support.ts');

    expect(board).toContain('ErrorState');
    expect(board).toContain('formatSupportReadError');
    expect(board).toContain('Unable to load issue board');
    expect(board).toContain(
      'Issue queue metrics are temporarily unavailable. Please refresh and try again.'
    );
    expect(board).toContain('onRetry={refetch}');
    expect(board).not.toContain('Failed to load issues');
    expect(board).not.toContain('error instanceof Error ? error.message');
    expect(board).not.toContain('error.message');

    expect(formatter).toContain('formatSupportReadError');
    expect(formatter).toContain('isReadQueryError(error)');
    expect(hook).toContain('useIssuesWithSlaMetrics');
    expect(hook).toContain('normalizeReadQueryError');
    expect(hook).toContain("contractType: 'always-shaped'");
    expect(queryKeys).toContain('issuesListFiltered');
  });
});
