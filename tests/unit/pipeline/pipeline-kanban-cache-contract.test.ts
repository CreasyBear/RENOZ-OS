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

describe('pipeline kanban cache contract', () => {
  it('keeps board retry and dialog success refresh policy centralized', () => {
    const source = read('src/components/domain/pipeline/pipeline-kanban-container.tsx');

    expect(source).toContain(
      'function invalidatePipelineBoardQueries(queryClient: QueryClient, opportunityId?: string)'
    );
    expect(source).toContain('invalidatePipelineBoardQueries(queryClient);');
    expect(source).toContain('invalidatePipelineBoardQueries(queryClient, opportunityId);');

    expect(count(source, 'queryClient.invalidateQueries({ queryKey:')).toBe(3);
    expect(count(source, 'queryKeys.opportunities.lists()')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.metrics()')).toBe(1);
    expect(count(source, 'queryKeys.opportunities.detail(opportunityId)')).toBe(1);
  });
});
