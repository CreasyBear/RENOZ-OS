import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('product search query key contract', () => {
  it('keeps product search facets under the product query root', () => {
    const root = queryKeys.products.all;
    const searches = queryKeys.products.searches();
    const suggestions = queryKeys.products.search('battery', { limit: 10 });
    const facets = queryKeys.products.facets();

    expect(suggestions.slice(0, root.length)).toEqual(root);
    expect(suggestions.slice(0, searches.length)).toEqual(searches);
    expect(facets.slice(0, root.length)).toEqual(root);
    expect(searches).toEqual([...root, 'search']);
    expect(facets).toEqual([...root, 'facets']);
    expect(facets).not.toEqual(suggestions);
  });
});
