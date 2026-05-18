import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('support issue template read-state contract', () => {
  it('keeps issue template list read errors operator-safe', () => {
    const list = read('src/components/domain/support/issues/issue-template-list.tsx');
    const route = read('src/routes/_authenticated/settings/issue-templates.tsx');
    const formatter = read('src/lib/support/read-error-messages.ts');
    const hook = read('src/hooks/support/use-issue-templates.ts');
    const queryKeys = read('src/lib/query-key-catalog/support.ts');

    expect(list).toContain('formatSupportReadError');
    expect(list).toContain('Unable to load issue templates');
    expect(list).toContain(
      'Issue templates are temporarily unavailable. Please refresh and try again.'
    );
    expect(list).toContain('onRetry={onRetry}');
    expect(list).not.toContain('message={error.message}');
    expect(list).not.toContain('Failed to load templates');

    expect(route).toContain('const templatesError = error && !data ? error : null');
    expect(route).toContain('const templatesWarning = error && data ? error : null');
    expect(route).toContain('Templates unavailable');
    expect(route).toContain('Showing the most recent issue templates while refresh is unavailable.');

    expect(formatter).toContain('formatSupportReadError');
    expect(formatter).toContain('isReadQueryError(error)');
    expect(hook).toContain('useIssueTemplates');
    expect(hook).toContain('normalizeReadQueryError');
    expect(hook).toContain("contractType: 'always-shaped'");
    expect(queryKeys).toContain('issueTemplatesListFiltered');
  });
});
