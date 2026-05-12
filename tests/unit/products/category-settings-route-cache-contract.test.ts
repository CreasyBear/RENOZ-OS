import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('category settings route cache contract', () => {
  it('keeps the route refresh button scoped to the category tree query it renders', () => {
    const route = read('src/routes/_authenticated/settings/categories.tsx');
    const productHooks = read('src/hooks/products/use-products.ts');

    expect(route).toContain('const { data: categoriesData, isLoading, refetch } = useCategoryTree()');
    expect(route).toContain('void refetch()');
    expect(route).not.toContain('useQueryClient');
    expect(route).not.toContain('queryKeys.categories.all');
    expect(route).not.toContain('invalidateQueries');

    expect(productHooks).toContain('function invalidateProductCategoryMutationQueries');
    expect(productHooks).toContain('queryKeys.categories.list()');
    expect(productHooks).toContain('queryKeys.categories.tree()');
    expect(productHooks).not.toContain('queryKeys.categories.all');
  });
});
