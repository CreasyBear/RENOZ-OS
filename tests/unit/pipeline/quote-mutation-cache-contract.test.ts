import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function count(source: string, pattern: string): number {
  return source.split(pattern).length - 1;
}

describe('pipeline quote mutation cache contract', () => {
  it('keeps repeated quote mutation invalidation groups centralized', () => {
    const source = read('src/hooks/pipeline/use-quote-mutations.ts');

    expect(source).toContain('function invalidateOpportunityListCaches');
    expect(source).toContain('function invalidateQuoteVersionsAndOpportunity');
    expect(source).toContain('function invalidateQuoteExpiryCaches');

    expect(count(source, 'invalidateOpportunityListCaches(queryClient)')).toBe(4);
    expect(count(source, 'invalidateQuoteVersionsAndOpportunity(queryClient, opportunityId)')).toBe(2);
    expect(count(source, 'invalidateQuoteVersionsAndOpportunity(queryClient, variables.opportunityId)')).toBe(1);
    expect(count(source, 'invalidateQuoteExpiryCaches(queryClient)')).toBe(2);

    expect(count(source, 'queryKeys.opportunities.lists()')).toBe(1);
    expect(count(source, 'queryKeys.opportunities.infiniteLists()')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.quoteVersions(opportunityId)')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.opportunity(opportunityId)')).toBe(3);
    expect(count(source, 'queryKeys.pipeline.expiringQuotes(7)')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.expiredQuotes()')).toBe(1);
  });
});
