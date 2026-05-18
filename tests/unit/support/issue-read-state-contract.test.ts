import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('support issue read-state contract', () => {
  it('keeps issue list and detail read errors operator-safe', () => {
    const issueList = read('src/routes/_authenticated/support/issues/issues-page.tsx');
    const issueDetail = read(
      'src/components/domain/support/issues/issue-detail-container.tsx'
    );
    const formatter = read('src/lib/support/read-error-messages.ts');
    const hook = read('src/hooks/support/use-issues.ts');
    const queryKeys = read('src/lib/query-key-catalog/support.ts');

    expect(formatter).toContain('formatSupportReadError');
    expect(formatter).toContain('isReadQueryError(error)');
    expect(formatter).toContain("error.failureKind === 'not-found'");

    expect(issueList).toContain('formatSupportReadError');
    expect(issueList).toContain('Unable to load issues');
    expect(issueList).toContain(
      'Issue queue metrics are temporarily unavailable. Please refresh and try again.'
    );
    expect(issueList).not.toContain('error instanceof Error ? error.message');
    expect(issueList).not.toContain("'An error occurred'");
    expect(issueList).not.toContain('Failed to load issues');

    expect(issueDetail).toContain('formatSupportReadError');
    expect(issueDetail).toContain('isSupportReadNotFound');
    expect(issueDetail).toContain('const isNotFound = !error || isSupportReadNotFound(error)');
    expect(issueDetail).toContain("title={isNotFound ? 'Issue not found' : 'Unable to load issue'}");
    expect(issueDetail).toContain(
      'Issue details are temporarily unavailable. Please refresh and try again.'
    );
    expect(issueDetail).toContain('The requested issue could not be found.');
    expect(issueDetail).not.toContain('error instanceof Error ? error.message');
    expect(issueDetail).not.toContain('Failed to load issue');

    expect(hook).toContain('useIssuesWithSlaMetrics');
    expect(hook).toContain('normalizeReadQueryError');
    expect(hook).toContain("contractType: 'always-shaped'");
    expect(hook).toContain("contractType: 'detail-not-found'");
    expect(queryKeys).toContain('issuesListFiltered');
    expect(queryKeys).toContain('issueDetail');
  });
});
