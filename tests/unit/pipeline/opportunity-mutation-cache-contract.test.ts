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

describe('pipeline opportunity mutation cache contract', () => {
  it('keeps opportunity list and metrics invalidation centralized', () => {
    const source = read('src/hooks/pipeline/use-opportunity-mutations.ts');

    expect(source).toContain('function invalidateOpportunityListQueries(queryClient: QueryClient)');
    expect(source).toContain('function invalidatePipelineMetrics(queryClient: QueryClient)');
    expect(count(source, 'invalidateOpportunityListQueries(queryClient)')).toBe(6);
    expect(count(source, 'invalidatePipelineMetrics(queryClient)')).toBe(6);
    expect(count(source, 'queryKeys.opportunities.lists()')).toBe(4);
    expect(count(source, 'queryKeys.opportunities.infiniteLists()')).toBe(2);
    expect(count(source, 'queryKeys.pipeline.metrics()')).toBe(1);
  });
});
