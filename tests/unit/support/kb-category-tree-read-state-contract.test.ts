import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('knowledge base category tree read-state contract', () => {
  it('keeps category tree hard and stale read states operator-safe', () => {
    const route = read('src/routes/_authenticated/support/knowledge-base.tsx');
    const hook = read('src/hooks/support/use-knowledge-base.ts');
    const queryKeys = read('src/lib/query-keys.ts');
    const server = read('src/server/functions/support/knowledge-base.ts');
    const formatter = read('src/lib/support/read-error-messages.ts');

    expect(route).toContain('formatSupportReadError');
    expect(route).toContain('const categoryTreeError = categoriesError && !categories ? categoriesError : null');
    expect(route).toContain('const categoryTreeWarning = categoriesError && categories ? categoriesError : null');
    expect(route).toContain('Failed to load categories');
    expect(route).toContain(
      'Knowledge base categories are temporarily unavailable. Please refresh and try again.'
    );
    expect(route).toContain('Showing the most recent categories while refresh is unavailable.');
    expect(route).toContain('void refetchCategories();');
    expect(route).not.toContain('message={categoryTreeError.message}');

    expect(formatter).toContain('formatSupportReadError');
    expect(hook).toContain('useKbCategories');
    expect(hook).toContain('normalizeReadQueryError');
    expect(hook).toContain("contractType: 'always-shaped'");
    expect(hook).toContain(
      'Knowledge base categories are temporarily unavailable. Please refresh and try again.'
    );
    expect(queryKeys).toContain('kbCategoryList');
    expect(server).toContain('export const listCategories');
    expect(server).toContain('eq(kbCategories.organizationId, ctx.organizationId)');
  });
});
