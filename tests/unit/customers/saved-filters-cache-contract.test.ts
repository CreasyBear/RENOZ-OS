import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('saved customer filters cache contract', () => {
  it('keeps saved customer filters on a centralized customer query key', () => {
    const hook = read('src/hooks/customers/use-saved-filters.ts');
    const server = read('src/server/functions/customers/saved-filters.ts');

    expect(queryKeys.customers.savedFilters()).toEqual(['customers', 'saved-filters']);
    expect(hook).toContain('queryKey: queryKeys.customers.savedFilters()');
    expect(hook.match(/queryKeys\.customers\.savedFilters\(\)/g)?.length).toBe(4);
    expect(hook).not.toContain('SAVED_FILTERS_QUERY_KEY');
    expect(hook).not.toContain("[...queryKeys.customers.all, 'saved-filters']");

    expect(server).toContain('const ctx = await withAuth();');
    expect(server).toContain('eq(userPreferences.userId, ctx.user.id)');
    expect(server).toContain('eq(userPreferences.category, CUSTOMER_FILTERS_CATEGORY)');
    expect(server).toContain('organizationId: ctx.organizationId');
  });
});
