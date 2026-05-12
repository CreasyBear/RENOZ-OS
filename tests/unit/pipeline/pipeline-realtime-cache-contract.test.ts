import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline realtime cache contract', () => {
  it('refreshes explicit opportunity and quote families without realtime root invalidation', () => {
    const hook = read('src/hooks/realtime/use-pipeline-realtime.ts');

    expect(hook).toContain('queryKeys.opportunities.lists()');
    expect(hook).toContain('queryKeys.opportunities.infiniteLists()');
    expect(hook).toContain('queryKeys.opportunities.details()');
    expect(hook).toContain('queryKeys.opportunities.hotLeads()');
    expect(hook).toContain('queryKeys.opportunities.byStage(stage)');
    expect(hook).toContain('queryKeys.pipeline.board()');
    expect(hook).toContain('queryKeys.pipeline.stages()');
    expect(hook).toContain('queryKeys.pipeline.metrics()');
    expect(hook).toContain('queryKeys.quotes.lists()');
    expect(hook).toContain('queryKeys.quotes.details()');
    expect(hook).toContain('queryKeys.dashboard.pipeline()');
    expect(hook).toContain('queryKeys.dashboard.stats()');

    expect(hook).not.toContain('queryKeys.opportunities.all');
    expect(hook).not.toContain('queryKeys.quotes.all');
    expect(hook).not.toContain('queryKeys.opportunities.list({})');
  });
});
